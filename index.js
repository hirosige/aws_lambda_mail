require('dotenv').config()

var ejs  = require('ejs');
var fs     = require('fs');
var template = fs.readFileSync(__dirname + '/views/auto_reply.ejs', 'utf-8');

var aws = require('aws-sdk');
var SparkPost = require('sparkpost');
var client = new SparkPost(process.env.SPARKPOST_API_KEY);

var sns = new aws.SNS({
   apiVersion: '2010-03-31',
   region: process.env.AWS_SNS_REGION
});

class ApiGatewayResponse
{
    constructor(){
        this.statusCode = 200;
        this.headers = {};
        this.body = "";
    }
}

exports.handler = function(event, context, callback) {
  console.log(event);
  console.log(context);

  var contents = ejs.render(template, {
    name: event.name,
    company_name: event.company_name,
    subject: event.subject,
    body: event.body,
  });

  console.log(contents);

  sns.publish({
    Message: contents,
    Subject: process.env.SUBJECT_TO_YOU,
    TopicArn: process.env.TOPIC_ARN
  }, function(err, data){
    if ( err ) context.fail('fail');
  });

  client.transmissions.send({
    content: {
      from: process.env.SENDER_FROM,
      subject: process.env.INQUIRY_MAIL_SUBJECT,
      html: contents
    },
    recipients: [
      { address: event.email },
      { address: process.env.ADMIN_EMAIL }
    ]
  })
  .then(data => {
    console.log('Woohoo! You just sent your first mailing!');
    console.log(data);
  })
  .catch(err => {
    console.log('Whoops! Something went wrong');
    console.log(err);
  });

  const res = new ApiGatewayResponse();

  res.headers["Content-Type"] = "application/json";
  res.headers["Access-Control-Allow-Origin"] = "*";
  res.body = JSON.stringify(event);

  callback(null, res);
};
