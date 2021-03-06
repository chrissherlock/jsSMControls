(function() {
	this.SessionManager = function() {
		this.session = '';
		var debugging = true;
	
		// Privileged functions
		this.Login = function (username, password) {
			var html;
			var loginSucceeded;
			
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
					if ( $("#ID").length === 0 ) { // ID value doesn't exist on page, so add it to the DOM
						if (debugging===true) {
							console.log("Appending session to the DOM. Session ID is " + session);
						}
						$("body").append("<input type=\"hidden\" id=\"ID\"" + "value = \"" + session + "\">"); 
					}
					
					if (session) {
						if (debugging===true) {
							console.log("Logged on - session ID is " + session + ".");
						}
						loginSucceeded=true;
					} else {
						if (debugging===true) {
							console.log("Wrong credentials!");
						}
						loginSucceeded=false;
					}
				}
			});
			
			return loginSucceeded;
		}
		
		this.LoginPortal = function (username, password) {
			var html;
			
			// turn off caching
			$.ajaxSetup ({  
				cache: false		
			}); 
			
			$.ajax({
				url:"ServiceManager.aspx?lite", 
				async: false,
				success:function(result) {
					html = $(result);
					session = $("#ID", html).attr("value");
					if ( $("#ID").length === 0 ) { // ID value doesn't exist
						if (debugging===true) {
							console.log("Logged on - session ID is " + session + ".");
						}
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
						if (debugging===true) {
							console.log("Wrong credentials!");
						}
						loginSucceeded=false;
					} else {
						session = sessionReturned;
						if (debugging===true) {
							console.log("Logged on - session ID is " + session + ".");
						}
						loginSucceeded=true;
					}
				}
			});

			return loginSucceeded;
		}
		
		this.Logout = function () {
			$.post("ServiceManager.aspx?BTN_EXIT=True", 
				{ ID: session, TemplateName: "INNAVIGATION" },
				function() { 
					if (debugging===true) {
						console.log("Successfully logged out"); 
					}
				});
		}
	};
})();