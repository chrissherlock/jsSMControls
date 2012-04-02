(function() {
	window['DBControl'] = {};
	
	var dbControl;
	var session;
	var data;
	
	// Get around brain damaged problem with Internet Explorer and not being able to access XMLHttpRequest.responseBody.  
	// See http://miskun.com/javascript/internet-explorer-and-binary-files-data-access/ and also
	// http://stackoverflow.com/questions/1919972/how-do-i-access-xhr-responsebody-for-binary-data-from-javascript-in-ie
	
	if(/msie/i.test(navigator.userAgent) && !/opera/i.test(navigator.userAgent)) {
		var IEBinaryToArray_ByteStr_Script =
		"<!-- IEBinaryToArray_ByteStr -->\r\n"+
		"<script type='text/vbscript'>\r\n"+
		"Function IEBinaryToArray_ByteStr(Binary)\r\n"+
		"   IEBinaryToArray_ByteStr = CStr(Binary)\r\n"+
		"End Function\r\n"+
		"Function IEBinaryToArray_ByteStr_Last(Binary)\r\n"+
		"   Dim lastIndex\r\n"+
		"   lastIndex = LenB(Binary)\r\n"+
		"   if lastIndex mod 2 Then\r\n"+
		"       IEBinaryToArray_ByteStr_Last = Chr( AscB( MidB( Binary, lastIndex, 1 ) ) )\r\n"+
		"   Else\r\n"+
		"       IEBinaryToArray_ByteStr_Last = "+'""'+"\r\n"+
		"   End If\r\n"+
		"End Function\r\n"+
		"</script>\r\n";

		// inject VBScript
		document.write(IEBinaryToArray_ByteStr_Script);
	}
	
	function getXMLHttpRequest() 
	{
		if (window.XMLHttpRequest) {
			return new window.XMLHttpRequest;
		}
		else {
			try {
				return new ActiveXObject("MSXML2.XMLHTTP"); 
			}
			catch(ex) {
				return null;
			}
		}
	}

	
	function AjaxQuery(fileURL)
	{
		if(!/msie/i.test(navigator.userAgent)) {
			$.ajax({
				url:fileURL,
				async: false,			
				success:function(result) {
					data = result;
				}
			});
		} else {
			IeBinFileReaderImpl(fileURL);
		}
	}
	
	function IeBinFileReaderImpl(fileURL) {
		this.req = getXMLHttpRequest();
		this.req.open("GET", fileURL, true);
		this.req.setRequestHeader("Accept-Charset", "x-user-defined");
		// my helper to convert from responseBody to a "responseText" like thing
		var convertResponseBodyToText = function (binary) {
			var byteMapping = {};
			for ( var i = 0; i < 256; i++ ) {
				for ( var j = 0; j < 256; j++ ) {
					byteMapping[ String.fromCharCode( i + j * 256 ) ] =
						String.fromCharCode(i) + String.fromCharCode(j);
				}
			}
			// call into VBScript utility fns
			var rawBytes = IEBinaryToArray_ByteStr(binary);
			var lastChr = IEBinaryToArray_ByteStr_Last(binary);
			return rawBytes.replace(/[\s\S]/g,
									function( match ) { return byteMapping[match]; }) + lastChr;
		};

		this.req.onreadystatechange = function(event){
			if (that.req.readyState == 4) {
				that.status = "Status: " + that.req.status;
				//that.httpStatus = that.req.status;
				if (that.req.status == 200) {
					// this doesn't work
					//fileContents = that.req.responseBody.toArray(); 

					// this doesn't work
					//fileContents = new VBArray(that.req.responseBody).toArray(); 

					// this works...
					var fileContents = convertResponseBodyToText(that.req.responseBody);

					fileSize = fileContents.length-1;
					if(that.fileSize < 0) throwException(_exception.FileLoadFailed);
					that.readByteAt = function(i){
						return fileContents.charCodeAt(i) & 0xff;
					};
				}
				if (typeof callback == "function"){ callback(that);}
			}
		};
		this.req.send();
	}
	
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
	
	function getDBControl() {
		var elements = document.getElementsByTagName("object");
		
		for (var i = 0; i < elements.length; i++) {
			var tag = elements[i];
			var isDB = tag.getAttribute("classid") == "CLSID:5C98EC99-4964-4290-A14D-FF4B9D4E8696" ? true: false;  
						
			if (isDB) {
				return tag;
			}
		} 
		
		return null;	
	}
	
	function clearParam() {
		dbControl = dbControl || getDBControl();
		if (dbControl != null) {
			dbControl.clearParam();
			return true;
		}
		return false;
	}
	
	window['DBControl']['clearParam'] = clearParam;
	
	function AddParam(param, value) {
		dbControl = dbControl || getDBControl();
		if (dbControl != null) {
			if (param == null || value == null) {
				return false;
			} else {
				dbControl.AddParam(param, value);
				return true;
			}
		}
	}
	
	window['DBControl']['AddParam'] = AddParam;
	
	function GetRecordSet(query) {
		dbControl = dbControl || getDBControl();
		if (dbControl != null) {
			if (query == null) {
				return null;
			} else {
				return dbControl.GetRecordSet(query);
			}
		}
	}
	
	window['DBControl']['GetRecordSet'] = GetRecordSet;
	
	function GetRecordSet2(query) {
		var getRSUrl = "http://chris-pc/ita/ServiceManager.aspx?GetRS&ID=" + session + "&Query=" + query; 
		
		$.ajaxSetup ({  
		    cache: false  
		}); 
		
		AjaxQuery(getRSUrl);		
		
		return data;
	}
	
	window['DBControl']['GetRecordSet2'] = GetRecordSet2; 
	
	window['SessionManager'] = {};
	
	// Login
	
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
	
	// Logout
	
	function Logout() {
		alert(session);
		$.post("http://chris-pc/ita/ServiceManager.aspx?BTN_EXIT=True", 
			{ ID: GetSession() },
			function(data) {
				alert("Logged out");
			});
	}
	
	window['SessionManager']['Logout'] = Logout;
	
	
})();
	


