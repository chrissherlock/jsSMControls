(function() {
	
	/* Session Management functions (login, logout) */
	
	// Setup session manager namespace
	window['SessionManager'] = {};
	
	// private variables
	var session;
	
	// Public functions
	function Login(username, password) {
		var html;
		
		// turn off caching
		$.ajaxSetup ({  
		    cache: false  
		}); 
		
		$.ajax({
			url:"http://chris-pc/ita/ServiceManager.aspx?&TemplateName=InLogin&USER_ID=" + username + "&PASS_WORD=" + password + "&DATABASE=1", 
			success:function(result) {
				html = $(result);
				session = $("#ID", html).attr("value");
				//alert(session);
				if ( $("#ID").length === 0 ) { // ID value doesn't exist
					$("body").append("<input type=\"hidden\" id=\"ID\"" + "value = \"" + session + "\">"); 
				}
				//alert("Logged in!");
			}
		});
	}

	window['SessionManager']['Login'] = Login;
	
	function GetSession() {
		return session;
	}
	
	window['SessionManager']['GetSession'] = GetSession;
	
	function Logout() {
		alert(session);
		$.post("http://chris-pc/ita/ServiceManager.aspx?BTN_EXIT=True", 
			{ ID: GetSession() },
			function(data) {
				alert("Logged out");
			});
	}
	
	window['SessionManager']['Logout'] = Logout;

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
	
	// Setup database controls namespace
	
	window['DBControl'] = {};
	
	var dbControl;
	var data;
	
	function GetEnvVariables(data) {
		var stringData = data.toString();
		alert(data.length);
		var view = new jDataView(stringData);
		// 8 characters for INFRA_DT and 6 characters for the number of fields
		// (trim the end spaces)
		var numFields = parseInt($.trim(view.getString(6, 8))); 

		var index = 8+6;
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
					
					//alert(fieldName + " (string) value is: " + fieldValue);
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
						//alert(fieldName + " (datetime) value is: " + fieldValue);						
					} else if (floatingRe.exec(rawValue)) {
						fieldValue = parseFloat($.trim(rawValue));
						index += fieldValueLen;
						//alert(fieldName + " (float) value is: " + fieldValue);
					} else {					
						if (booleanRe.exec(rawValue)) { // boolean value?
							fieldValue = rawValue;
							index += fieldValueLen;
						} else { // just a regular integer value
							fieldValue = parseInt($.trim(rawValue));
							index += fieldValueLen;
						}
						//alert(fieldName + " (integer) value is: " + fieldValue);
					}
					break;
			}
			
			fieldsCntr++;
		}
		
		return index;
	}
	
	function GetPayloadData(data, index) {
		var curPos = index;
		
		var fieldMarker;
		var colHdrLen;
		var colHdrType;
		var colHdrIsNull;
		var colHdrName;

		var isHeader=true;
		
		var dbgAlert;
		
		var stringData = data.toString();
		var view = new jDataView(stringData);
		
		while (isHeader) {
			fieldMarker = view.getChar(curPos);

			if (fieldMarker !== "F") {
				break;
			}
			
			curPos += 1;
			dbgAlert = "Field marker: " + fieldMarker;
			
			colHdrLen = view.getUint32(curPos, true);
			curPos += 5;		
			dbgAlert += "\nColumn name length: " + colHdrLen;
			
			colHdrType = view.getUint32(curPos, false);
			curPos += 4;
			dbgAlert += "\nColumn type: " + colHdrType;
			
			colHdrIsNull = view.getUint8(curPos);
			curPos += 1;
			dbgAlert += "\nColumn is null?: " + colHdrIsNull;
			
			colHdrName = view.getString(colHdrLen, curPos);
			curPos += colHdrLen;
			dbgAlert += "\nColumn name:" + colHdrName; 
			
			alert(dbgAlert);
		}
	}
	
	function ParseData(data) {		
		var index = GetEnvVariables(data);
		GetPayloadData(data, index);		
	}
	
	window['DBControl']['ParseData'] = ParseData;
	
	function GetRecordSet(query) {
		// FIXME - needs the ability to add parameters
		var getRSUrl = "/ServiceManager.aspx?GetRS&ID=" + session + "&Query=" + query; 
		
		$.ajaxSetup ({  
		    cache: false  
		}); 
		
		$.ajax({
			url:fileURL,
			async: false,			
			success:function(result) {
				data = result;
			}
		});		
		
		return data;
	}
	
	window['DBControl']['GetRecordSet'] = GetRecordSet; 
	
})();
	


