function checkSignedIn () {

  let idToken = localStorage.getItem("awsIdToken");
  let payload = idToken.split('.')[1];
  let tokenobj = JSON.parse(atob(payload));
  // let formatted = JSON.stringify(tokenobj, undefined, 2);
  
  let expired = ((Date.now() / 1000) > tokenobj.exp);
  
  if (expired) {
    // open login.html
    window.open("login.html", 'camera_trap_login');
  }
  else {
    let logins = {};
    logins[idpDomain] = idToken;
  
    AWS.config.update({region: bucketRegion});
  
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: identityPoolId,
      Logins: logins
    });
  
    AWS.config.credentials.get(function(err){
      if (err) return console.log("Error", err);
      // we got credentials
    });
  }

}

checkSignedIn();
