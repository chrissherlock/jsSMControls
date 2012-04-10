$(document).ready(function() { 
	$("#Test").click(function() {
		var DB = document.getElementById('DB');
		DB.clearParam();
		DB.addParam("NAME", "(GMT-10:00) Hawaii");
		DB.getRecordSet("Select TIME_ZONE");
	});
	
	$("#Login").click(function() { 
		URL = "ServiceManager.aspx?&TemplateName=InLogin&USER_ID=" + $("#USER_ID").val() + "&PASS_WORD=" + $("#PASSWORD").val() + "&DATABASE=1";
		alert(URL);
		$.ajax({
			url:URL, 
			async: false,
			success:function(result) {
				html = $(result);
				session = $("#ID", html).attr("value");
				if ( $("#ID").length === 0 ) { // ID value doesn't exist
					$("body").append("<input type=\"hidden\" id=\"ID\"" + "value = \"" + session + "\">"); 
					alert(session);
				}
				
				if (session) {
					loginSucceeded=true;
				} else {
					loginSucceeded=false;
				}
			}
		});
	});
})