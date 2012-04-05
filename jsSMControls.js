(function() {
	
	/* Session Management functions (login, logout) */
	
	// Setup session manager namespace
	window['SessionManager'] = {};
	
	// private variables
	var session;
	var system = 'vsm'
	
	// Public functions
	function Login(username, password) {
		var html;
		
		// turn off caching
		$.ajaxSetup ({  
		    cache: false  
		}); 
		
		$.ajax({
			url:"ServiceManager.aspx?&TemplateName=InLogin&USER_ID=" + username + "&PASS_WORD=" + password + "&DATABASE=1", 
			async: false,
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
	
	function LoginPortal(username, password) {
		var html;
		
		// turn off caching
		$.ajaxSetup ({  
		    cache: false,		
		}); 
		
		$.ajax({
			url:"ServiceManager.aspx?lite", 
			async: false,
			success:function(result) {
				html = $(result);
				session = $("#ID", html).attr("value");
				if ( $("#ID").length === 0 ) { // ID value doesn't exist
					$("body").append("<input type=\"hidden\" id=\"ID\"" + "value = \"" + session + "\">"); 
				}
			}
		});

		var data = new FormData();
		data.append("USER_ID", username);
		data.append("PASS_WORD", password);
		data.append("TemplateName", "LITELOGIN");
		data.append("ID", session);
		data.append("DATABASE", system);
		data.append("BTN_OK", '');
		
		var loginSucceeded;
		
		$.ajax({
			url:"ServiceManager.aspx?lite", 
			data: data,
			async: false,
			contentType: false,
			processData: false,
			type: 'POST',
			success:function(result) {
				html = $(result);
				sessionReturned = $("#ID", html).attr("value");
				if ($("#USER_ID", html).length !== 0) {
					alert("Wrong credentials!");
					loginSucceeded=false;
				} else {
					alert("Session ID:" + session + "\nReturned session ID: " + sessionReturned + "\nLogged in!");
					session = sessionReturned;
					loginSucceeded=true;
				}
			}
		});

		return loginSucceeded;
	}

	window['SessionManager']['LoginPortal'] = LoginPortal;
	
	function GetSession() {
		return session;
	}
	
	window['SessionManager']['GetSession'] = GetSession;
	
	function Logout() {
		alert(session);
		$.post("ServiceManager.aspx?BTN_EXIT=True", 
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
	var params = [];
	
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
		
		var columns = [];
		
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
		
		$.each(columns, function(index, value) {
			alert('Column name: ' + columns[index].name + '\nColumn type: ' + columns[index].type + '\nColumn length: ' + columns[index].length);
		});
	}
	
	function ParseData(data) {		
		var index = GetEnvVariables(data);
		GetPayloadData(data, index);		
	}
	
	window['DBControl']['ParseData'] = ParseData;
	
	function GetRecordSet(query) {
		// FIXME - needs the ability to add parameters
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
		
		return data;
	}
	
	window['DBControl']['GetRecordSet'] = GetRecordSet; 
	
	function AddParam(param, value) {
		params.push({"param": param, "value": value});
	}
	
	window['DBControl']['AddParam'] = AddParam;
	
	function ClearParam() {
		params = [];
	}
	
	window['DBControl']['ClearParam'] = ClearParam;
	
})();
	


