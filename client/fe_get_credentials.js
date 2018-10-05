var albumBucketName = 'tagphoto';
var bucketRegion = 'ap-northeast-1';

AWS.config.update({region: bucketRegion});
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
					IdentityPoolId: 'ap-northeast-1:83570204-11bb-4601-8094-2dc2ccfbc88a',
					Logins: {
						'cognito-idp.ap-northeast-1.amazonaws.com/ap-northeast-1_JACElFd4C': localStorage.getItem('awsIdToken')
					}
				});

AWS.config.credentials.get(function(err){
					if (err) return console.log("Error", err);
					// 成功透過 FB 登入 AWS Cognito，取得 identity id，不知道有沒有其他取得 identity id 的方法？			
					var identity_id = AWS.config.credentials.identityId;
					console.log("Cognito Identity Id", AWS.config.credentials.identityId);
				});


