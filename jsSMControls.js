(function() {
	
	// global variables
	system = 'vsm';

	/* Database controls functions (login, logout) 
	
	   NOTE: this does NOT work in Internet Explorer. The reason for this is that 
	     Internet Explorer assumes that all string data is null terminated, whereas
	     ECMA-262 section 8.4 merely states:
			     
			"The String type is the set of all finite ordered sequences of zero or 
			more 16-bit unsigned integer values (?elements?). The String type is 
			generally used to represent textual data in a running ECMAScript program, 
			in which case each element in the String is treated as a code unit value 
			(see Clause 6). Each element is regarded as occupying a position within 
			the sequence. These positions are indexed with nonnegative integers. The 
			first element (if any) is at position 0, the next element (if any) at 
			position 1, and so on. The length of a String is the number of elements 
			(i.e., 16-bit values) within it. The empty String has length zero and 
			therefore contains no elements.
			
			When a String contains actual textual data, each element is considered to 
			be a single UTF-16 code unit. Whether or not this is the actual storage 
			format of a String, the characters within a String are numbered by their 
			initial code unit element position as though they were represented using 
			UTF-16. All operations on Strings (except as otherwise stated) treat them 
			as sequences of undifferentiated 16-bit unsigned integers; they do not 
			ensure the resulting String is in normalised form, nor do they ensure 
			language-sensitive results."
				  
			(see also section 4.3.16)
			
		There IS a hack to get around this via using some sort of CStr function and then 
		extract the information from IE's reponsebody header, but until I can work out a 
		clean way of resolving this code problem, IE is not supported. 
		
		Code patches welcome :-)
		
	*/
	
	this.DBControl = function () {
		// privileged interface
		
		this.getRecordSet = function (query) {
			var RSURL = "ServiceManager.aspx?GetRS&ID=" + session + "&Query=" + query; 
			
			numParams = params.length;
			if (numParams != 0) {
				for (paramCntr = 0; paramCntr < numParams; paramCntr++) {
					RSURL += "&" + params[paramCntr].param + "=" + params[paramCntr].value;
				}
			}
			
			$.ajaxSetup ({  
				cache: false  
			}); 
			
			$.ajax({
				url:RSURL,
				async: false,			
				success:function(result) {
					data = result;
				}
			});		
			
			deserializeData();
		}
		
		this.addParam = function (param, value) {
			var exists = false;
			var numParams = params.length;
			
			if (numParams != 0) {
				for (paramCntr = 0; paramCntr < numParams; paramCntr++) {
					if (params[paramCntr].name === param) {
						exists = true;
						break;
					}
				}
			}
			
			if (!exists) {
				params.push({"param": param, "value": value});
			}
		}
		
		this.removeParam = function (param) {
			var numParams = params.length;
			
			if (numParams != 0) {
				for (paramCntr = 0; paramCntr < numParams; paramCntr++) {
					if (params[paramCntr].name === param) {
						// splice removes the element from the array
						// we then break as AddParam guarantees that the param
						// will only be in the array once
						params.splice(paramCntr, 1);
						break; 
					}
				}
			}
		}
		
		this.clearParam = function () {
			params = [];
		}	

		// private
		
		var columns = [];
		var rows = [];

		var data;
		var index;
		
		var params = [];
		
		var dataTypeEnum = {
			Binary : 8,
			Boolean: 7,
			DateTime: 6,
			String: 5,
			Double: 4,
			Int64: 3,
			Int32: 2,
			Int16: 1,
			Unknown: 0
		}
		
		function getEnvVariables() {
			// FIXME - needs a try/catch
			var stringData = data.toString();
			var view = new jDataView(stringData);
			// 8 characters for INFRA_DT and 6 characters for the number of fields
			// (trim the end spaces)
			var numFields = parseInt($.trim(view.getString(6, 8))); 

			index = 8+6;
			var fieldsCntr = 0;
			
			while (fieldsCntr < numFields) {
				var fieldNameLen;
				var fieldName;
				var fieldType;
				
				var fieldValueLen;
				var fieldValue;
				
				fieldNameLen = parseInt($.trim(view.getString(6, index)));
				index += 6;
				
				fieldName = view.getString(fieldNameLen, index);
				index += fieldNameLen;

				fieldType = view.getString(1, index);
				index += 1;
				
				switch(fieldType) {
					case 'J':
						fieldValueLen = parseInt("0x" + view.getString(8, index));
						index += 8;
						
						fieldValue = view.getString(fieldValueLen, index);
						index += fieldValueLen;
						
						break;
					
					case 'I':
						fieldValueLen = parseInt(view.getString(6, index));
						index += 6;
						
						var datetimeRe = new RegExp("^~DT~.*"); 
						var floatingRe = new RegExp("[-+]?[0-9]*\.?[0-9]+");
						var booleanRe = new RegExp("(False|True)");
						
						var rawValue = view.getString(fieldValueLen, index);
						
						if (datetimeRe.exec(rawValue)) {
							fieldValue = rawValue;
							index += fieldValueLen;			
						} else if (floatingRe.exec(rawValue)) {
							fieldValue = parseFloat($.trim(rawValue));
							index += fieldValueLen;
						} else {					
							if (booleanRe.exec(rawValue)) { // boolean value?
								fieldValue = rawValue;
								index += fieldValueLen;
							} else { // just a regular integer value
								fieldValue = parseInt($.trim(rawValue));
								index += fieldValueLen;
							}
						}
						break;
				}
				
				fieldsCntr++;
			}
		}
		
		function getPayloadData() {
			var curPos = index;
			
			var fieldMarker;
			
			var row = [];
			
			var colHdrLen;
			var colHdrType;
			var colHdrIsNull;
			var colHdrName;

			var isHeader=true;
			
			var stringData = data.toString();
			var view = new jDataView(stringData);
			
			while (isHeader) {
				fieldMarker = view.getChar(curPos);

				if (fieldMarker !== "F") {
					break;
				}
				
				curPos += 1;
				
				colHdrLen = view.getUint32(curPos, true);
				curPos += 5;		
				
				colHdrType = view.getUint32(curPos, false);
				curPos += 4;
				
				colHdrIsNull = view.getUint8(curPos);
				curPos += 1;
				
				colHdrName = view.getString(colHdrLen, curPos);
				curPos += colHdrLen;
				
				columns.push({ "name" : colHdrName, "type" : colHdrType, "length" : colHdrLen, "isNull" : colHdrIsNull });
			}
			
			// actual data
			while (curPos < data.length) {
				var colIdx;
				var value;
				var len;
				var recordDelimiter;
				var endOfData;
				
				recordDelimiter = view.getString(1, curPos);
				endOfData = view.getInt32(curPos, true);
				if (recordDelimiter !== 'R') {
					if (endOfData === 0) { 		// end of data is 0. Really... I know how big the data is in bytes, WHY does it need this?!?
						break;
					}
				}
				curPos += 1; // "R" delimiter
				
				for (colIdx = 0; colIdx < columns.length; colIdx++) {
					switch (columns[colIdx].type) {  
						case dataTypeEnum.Int16:
							len = view.getInt32(curPos, true);
							curPos += 4;
							value = view.getInt16(curPos, true);
							curPos += 2;
							break;
						case dataTypeEnum.Int32:
							len = view.getInt32(curPos, true);
							curPos += 4;
							value = view.getInt32(curPos, true);
							curPos += 4;
							break;
						case dataTypeEnum.Int64:
							len = view.getInt32(curPos, true);
							curPos += 4;
							value = view.getInt64(curPos, true);
							curPos += 8;
							break;
						case dataTypeEnum.Double:
							len = view.getInt32(curPos, true);
							curPos += 4;
							value = view.getFloat64(curPos, true);
							curPos += 8;
							break;
						case dataTypeEnum.String:
							len = view.getInt32(curPos, true);
							curPos += 4;
							value = view.getString(len, curPos);
							curPos += len;
							break;
						case dataTypeEnum.DateTime:
							len = view.getInt32(curPos, true);
							curPos += 4;
							value = view.getFloat64(curPos, true);
							curPos += 8;
							break;
						case dataTypeEnum.Boolean:
							len = view.getInt32(curPos, true);
							curPos += 4;
							value = view.getUint8(curPos);
							curPos += 1;
							break;
						case dataTypeEnum.Binary:
							len = view.getInt32(curPos, true);
							curPos += 4;
							value = view.getString(len, curPos);
							curPos += len;
							break;
					}
					
					row.push( {"name": columns[colIdx].name, "value": value } );
				}
				rows.push(row);
				row = [];
			}
		}	

		function deserializeData() {		
			getEnvVariables();
			getPayloadData();		
		}
	};
	
})();
	


