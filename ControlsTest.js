$(document).ready(function() { 
	var rs;
	var DB = new DBControl();
	
	$("#GetRecordSet").attr("disabled","disable");
	$("#ParseData").attr("disabled","disable");
	$("#Logout").attr("disabled","disable");
	
	$("#Login").click(function() { 
		var loginSucceeded = SessionManager.Login($('#USER_ID').val(), $('#PASSWORD').val()); 
		$("#Login").attr("disabled","disable"); 
		if (loginSucceeded) {
			$("#GetRecordSet").removeAttr("disabled");
			$("#ParseData").removeAttr("disabled","disable");
			$("#Logout").removeAttr("disabled","disable");
			$("#Login").attr("disabled","disable");
		} else
		{
			$("#GetRecordSet").attr("disabled","disable");
			$("#ParseData").attr("disabled","disable");
			$("#Logout").attr("disabled","disable");
			$("#Login").removeAttr("disabled","disable");
		}
		
	});
	$("#GetRecordSet").click(function() { 
		DB.ClearParam();
		DB.AddParam("NAME", "(GMT-10:00) Hawaii");
		rs = DB.GetRecordSet("Select TIME_ZONE");
		alert(rs);
	});
	$("#ParseData").click(function() { DB.ParseData(rs); });
	$("#Logout").click(function() {
		$("#GetRecordSet").attr("disabled","disable");
		$("#ParseData").attr("disabled","disable");
		$("#Logout").attr("disabled","disable");
		$("#Login").removeAttr("disabled","disable");
		SessionManager.Logout(); 
	});
});