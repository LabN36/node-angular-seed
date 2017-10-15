var fs                = require ('fs');
var mongoose          = require ('mongoose');
var mongooseValidator = require ('mongoose-validator').validate;
var xss               = require ('xss');
var _                 = require('underscore');
// var conf              = require ('./sznConfiguration');

var templateStatusTypes = ['active', 'inactive', 'deleted'];
var mediaTypes          = ['video', 'audio', 'text', 'image'];
var mediaSourceTypes    = ['SezionID', 'HTTP', 'AWS_S3'];
var videoOutputTypes    = ['sezion', 'awsS3', 'youtube'];
var videoStatusTypes    = ['created', 'queued', 'processing', 'done', 'error', 'deleted'];
var notificationTypes   = ['error', 'billing', 'notice'];
var accountErrorType    = ['payment_subscription'];
var webAuthTypes        = ['none', 'basic', 'digest'];

var youtubeLicenses     = ['youtube', 'creativeCommon'];
var youtubePrivacies    = ['public', 'private', 'unlisted'];
var youtubeCategories   = ['Film','Autos','Music','Animals','Sports','Travel','Games','People','Comedy',
                           'Entertainment','News','Howto','Education','Tech','Nonprofit'];
var videoFormats        = ['MP4_H264_AAC', 'MPG_MPEG2_MP2', 'OGG_THEORA_VORBIS', 'WEBM_VP8_VORBIS'];
var CTATypes            = ['text','html'];
var CTAFormFieldTypes   = ['email','text'];

var profileFiles        = fs.readdirSync ('/opt/sezion/videoProfiles/');
var outProfiles         = new Array ();


var xssWhiteList = {
  body:['class','id'],
  head:[],
  title:[],
  style:[],
  link:['href','rel'],
  i:['class','id'],
  figure:['class','id'],
  figcaption:['class','id'],
  button:['class','id']
};
_.extend(xssWhiteList,xss.whiteList);

var xssFilter = new xss.FilterXSS({
  whiteList: xssWhiteList
});
var sanitizeHTML = function(html) {
  try {
    return xssFilter.process(html);
    // return html;
  } catch (e) {
    return null;
  }
};

for (var i = 0; i < profileFiles.length; i++)
  outProfiles[i] = profileFiles[i].split(".")[0];

require('mongoose-validator').extend('areIn', function (values) {
    var elems = this.str.split(",");
    for (var i = 0; i < elems.length; i++) {
      if (values.indexOf (elems[i]) == -1) return false;
    }
    return true;
}, 'Not in array');

function profilePriceArrayValidator (values) {

  console.log ("[sznMongoSchemas]: profilePriceArray validator values:", values);

  for (var i in values) {
    if (outProfiles.indexOf (i) == -1) return false;
  }
  return true;
}

function videoDataValidator (values) {

  console.log ("[sznMongoSchemas]: videoDataValidator values: ", values)
  console.log ("[sznMongoSchemas]: videoDataValidator this: ", this)

  if (this.data && this.data.lengh > 1024) return false;
  else return true;

}

/**
 * [tagsValidator validator of video keywords with YouTube API v3 of limits reference]
 * https://developers.google.com/youtube/v3/docs/videos#snippet.tags[]
 * @param  {String} values [video keywords list. elements separates by commas]
 * @return {Boolean}        return true if pass the validator
 */
function tagsValidator (values) {

  if (!values) return true;
  // var length = Buffer.byteLength (values, 'utf8');
  // if (values && length > 500) return false;
  if (values.indexOf("<") != -1) return false;
  if (values.indexOf(">") != -1) return false;

  var numChars = values.length,
      tags = values.split(",");
      console.log('[sznMongoSchemas] numChars before spaces:',numChars);
      console.log('[sznMongoSchemas] tags:',tags);
      tags.forEach(function(item){
        if(item.indexOf(' ')!=-1)
          numChars += 2; //add 2 spaces (youtube add 2 quotes mark by tag with spaces)
      });
      console.log('[sznMongoSchemas] numChars with spaces:',numChars);
  if(numChars>500) return false;

  // for (var i = 0; i < tags.length; i++) {
  //   if (tags[i].length < 2 || tags[i].length > 30) return false;
  // }
  return true;

}
/**
 * [videoTitleValidator validator of video title with YouTube API v3 of limits reference]
 * https://developers.google.com/youtube/v3/docs/videos#snippet.title
 * @param  {String} values [video title]
 * @return {Boolean}        return true if pass the validator
 */
function videoTitleValidator (values) {
  if (!values) return true;
  console.log('title length: ',values.length)
  if (values.length > 100) return false;
  // var length = Buffer.byteLength (values, 'utf8');
  // if (length > 100) return false;
  if (values.indexOf("<") != -1) return false;
  if (values.indexOf(">") != -1) return false;
  return true;
}

/**
 * [videoDescriptionValidator validator of video description with YouTube API v3 of limits reference]
 * https://developers.google.com/youtube/v3/docs/videos#snippet.description
 * @param  {String} values [video description]
 * @return {Boolean}        return true if pass the validator
 */
function videoDescriptionValidator (values) {
  if (!values) return true;
  console.log('description bytes length: ',length)
  var length = Buffer.byteLength (values, 'utf8');
  if (length > 5000) return false;
  if (values.indexOf("<") != -1) return false;
  if (values.indexOf(">") != -1) return false;
  return true;
}

/**
 * [arrayLengthValidator validator of array size]
 * @param  {Array} values [value]
 * @return {Boolean}        return true if pass the validator
 */
function arrayLengthValidator (values) {
  if(!values){
    return false;
  }
  if(values.length === 1){
    return true;
  }else{
    return false;
  }
}

var apiErrors = {

  jsonrpc : function (err) {
    return {error: err};
  },

  TEMPLATE_NOT_FOUND        : function (data) {return {code: 1000, message: "Template not found", data:data}},
  MEDIA_NOT_FOUND           : function (data) {return {code: 1001, message: "Media not found", data:data}},
  MEDIA_ID_NOT_FOUND        : function (data) {return {code: 1002, message: "MediaID not found in scripts", data:data}},
  INPUT_NOT_ALLOWED         : function (data) {return {code: 1003, message: "Inputs not allowed for this template", data:data}},
  SCRIPT_MEDIAS_MISTMATCH   : function (data) {return {code: 1004, message: "Scripts inputs and medias mismatch", data:data}},
  BAD_SCRIPT                : function (data) {return {code: 1005, message: "Bad script", data:data}},
  VIDEO_FILE_NOT_FOUND      : function (data) {return {code: 1006, message: "Video file not found", data:data}},
  VIDEO_NOT_FOUND           : function (data) {return {code: 1007, message: "Video not found", data:data}},
  MEDIA_IN_USE              : function (data) {return {code: 1008, message: "Media in use in templates", data:data}},
  NO_SCRIPT                 : function (data) {return {code: 1009, message: "No scripts", data: data}},
  ACCOUNT_NOT_FOUND         : function (data) {return {code: 1010, message: "Account not found", data: data}},
  ERR_DOWNLOADING_MEDIAS    : function (data) {return {code: 1011, message: "Error downloading medias", data:data}},
  ERR_VMIX                  : function (data) {return {code: 1012, message: "Error processing video", data:data}},
  YOUTUBE_UPLOAD_ERROR      : function (data) {return {code: 1013, message: "Error uploading to Youtube", data:data}},
  YOUTUBE_ACCOUNT_NOT_FOUND : function (data) {return {code: 1014, message: "Youtube Account not Found", data:data}},
  AUTHENTICATION_ERROR      : function (data) {return {code: 1015, message: "Authentication error", data: data}},
  EMAIL_IN_USE              : function (data) {return {code: 1016, message: "Email already used", data: data}},
  BAD_PASSWORD              : function (data) {return {code: 1017, message: "Bad password", data: data}},
  BAD_SECRET                : function (data) {return {code: 1018, message: "Bad secret", data: data}},
  UPLOAD_NO_SIZE            : function (data) {return {code: 1019, message: "No size specified (content-length)", data: data}},
  UPLOAD_BAD_CONTENT_TYPE   : function (data) {return {code: 1020, message: "Invalid Content-Type", data: data}},
  ACCOUNT_NOT_ACTIVE        : function (data) {return {code: 1021, message: "Account not active", data: data}},
  YOUTUBE_UPLOAD_BAD_TOKEN  : function (data) {return {code: 1023, message: "Youtube upload bad token", data: data}},
  ACCOUNT_TYPE_NOT_FOUND    : function (data) {return {code: 1025, message: "Account type not found", data: data}},
  PAYMENT_CLIENT_ERROR      : function (data) {return {code: 1026, message: "Payment client error", data: data}},
  PAYMENT_MISMATCH          : function (data) {return {code: 1027, message: "Payment mismatch", data: data}},
  TEMPLATE_INACTIVE         : function (data) {return {code: 1028, message: "Template inactive", data: data}},
  BAD_INPUT_MEDIA           : function (data) {return {code: 1029, message: "Bad input media", data: data}},
  ERR_DELETING_VIDEO_FILES  : function (data) {return {code: 1030, message: "Error deleting video files", data: data}},
  VIDEO_NOT_IN_YOUTUBE      : function (data) {return {code: 1031, message: "Video is not in Youtube", data:data}},
  ACCOUNT_NO_CUSTOM_PROFILES: function (data) {return {code: 1032, message: "This account type does not allow custom video profiles", data:data}},
  TEMPLATE_NO_VIDEO_PROFILES: function (data) {return {code: 1032, message: "No video profiles in template", data:data}},
  DUPLICATED_PROFILE_NAME   : function (data) {return {code: 1032, message: "Duplicated profile name", data:data}},

  VIDEOS_STORAGE_LIMIT      : function (data) {return {code: 2000, message: "Stored videos size limit reached", data:data}},
  MEDIA_STORAGE_LIMIT       : function (data) {return {code: 2001, message: "Stored medias size limit reached", data:data}},
  VIDEO_PROFILE_NOT_ALLOW   : function (data) {return {code: 2002, message: "Video profile not allowed", data:data}},
  TEMPLATE_FREE_VARS        : function (data) {return {code: 2003, message: "Too much free objects in template", data:data}},
  NO_CREDIT                 : function (data) {return {code: 2004, message: "No credit", data:data}},
  TEMPLATE_LIMIT            : function (data) {return {code: 2005, message: "Max templates reached", data:data}},
  VARIABLES_MISTMATCH       : function (data) {return {code: 2005, message: "Not all variables defined", data:data}},
  INVALID_CTA_START_TIME    : function (data) {return {code: 2006, message: "CTA start time cannot be empty.", data:data}},
  INVALID_CTA_FORM_FIELDS   : function (data) {return {code: 2007, message: "Atleast one field must be specified.", data:data}},
  CONFLICTING_START_TIME    : function (data) {return {code: 2007, message: "More than one elements have the same start time.", data:data}},
  CONFLICTING_END_TIME    : function (data) {return {code: 2007, message: "More than one elements have the same end time.", data:data}},
  INTERNAL_ERROR            : function (data) {return {code: 5000, message: "Internal Error", data:data}},


}

var inputMediaSchema = new mongoose.Schema ({

  inputID:   {type: String, required: true, index:true, unique: true},
  type:      {type: String, required: true, lowercase: true, enum:mediaTypes},
  name:      {type: String, validate: mongooseValidator ({passIfEmpty: true}, 'len', 1, 200)},
  text:      {type: String, validate: mongooseValidator ({passIfEmpty: true}, 'len', 1, 1000)},
  sezionID:  {type: mongoose.Schema.Types.ObjectId},
  http:      {type: String, validate: mongooseValidator ({passIfEmpty: true}, 'isUrl')},
  awsS3:     {bucket: {type: String, required:false},
              key   : {type: String, required:false}},
  cacheID:   {type:mongoose.Schema.Types.ObjectId}


}, {autoIndex: false, _id:false });


var youtubeAccountSchema = new mongoose.Schema ({

  id:           {type: String, required: true},
  name:         {type: String},
  profile:      {type: Object},
  accessToken:  {type: String},
  refreshToken: {type: String}

}, {autoIndex: false, _id:false });

var MediaSchema = new mongoose.Schema ({

  accountID: {index:true, type:mongoose.Schema.Types.ObjectId, required: true},
  container: {type: String, required: true},
  date:      {type: Date, default: Date.now },
  type:      {type: String, required: true, lowercase: true, enum:mediaTypes},
  name:      {type: String, validate: mongooseValidator ({passIfEmpty: true}, 'len', 1, 200)},
  desc:      {type: String, validate: mongooseValidator ({passIfEmpty: true}, 'len', 1, 1000)},
  size:      Number,
  template:  {type: mongoose.Schema.Types.ObjectId},
  patterns:  []

}, {autoIndex: false, collection: 'medias' });

if (!MediaSchema.options.toJSON) MediaSchema.options.toJSON = {};
MediaSchema.options.toJSON.transform = function (doc, ret, options) {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;
}

var VideoFileSchema = new mongoose.Schema ({

  name   : {type: String, required: true},
  profile: {type: String, required: true},
  size   : {type: Number, required: true},
  storage: {sezionID : String,
            awsS3    : {bucket: String,
                        key:    String},
            youtubeID: String,
            youtubeAccountID: String
  },
  deleted: {type: Boolean}

}, {autoIndex: false, _id:false });

var VideoProfileSchema = new mongoose.Schema ({
  name:            {type: String, required: true},
  format:          {type: String, required: true, validate: mongooseValidator  ('isIn', videoFormats)},
  resolution:      {width:   {type: Number, required: true, validate: mongooseValidator  ('min', 10)},
                    height:  {type: Number, required: true, validate: mongooseValidator  ('min', 10)}},
  aspect:          {numerator:   {type: Number, required: true},
                    denominator: {type: Number, required: true}},
  videoBitrate:    {type: Number, required: true, validate: mongooseValidator  ('min', 1000)},
  videoFPS:        {type: Number, required: true, validate: [mongooseValidator ('min', 1), mongooseValidator ('max', 60)]},
  audioSampleRate: {type: Number, required: true, validate: [mongooseValidator ('min', 8000), mongooseValidator ('max', 96000)]},
  audioChannels:   {type: Number, required: true, validate: [mongooseValidator ('min', 1),    mongooseValidator ('max', 2)]},
  audioBitrate:    {type: Number, required: true, validate: mongooseValidator  ('min', 1000)}
}, {autoIndex: false, _id:false});

var TemplateSchema = new mongoose.Schema ({

  status:       {type: String, enum:templateStatusTypes, required:true, default: 'active'},
  accountID:    {type:mongoose.Schema.Types.ObjectId, index:true, required: true},
  date:         {type: Date,   default: Date.now },
  name:         {type: String, required: true, validate: mongooseValidator('len', 1, 200)},
  description:  {type: String, validate: mongooseValidator ('len', 0, 1000)},
  secret:       {type: String, required: true},

  webhook: { url  :    {type: String, validate: mongooseValidator ({passIfEmpty: false}, 'isUrl')},
             auth :    {type: String, enum: webAuthTypes},
             username: {type: String},
             password: {type: String}},

  videoOutput:  {type       : {type: String, required: true, enum:videoOutputTypes},
                 awsS3Bucket: {type: String },
                 youtube  :   {id:       String,
                               license:  {type: String, required: false, enum:youtubeLicenses},
                               privacy:  {type: String, required: false, enum:youtubePrivacies},
                               category: {type: String, required: false, enum:youtubeCategories},
                               keywords: {type: String, required: false, validate: [tagsValidator, 'Bad youtube keywords. Read: https://developers.google.com/youtube/v3/docs/videos#snippet.tags[]']}
                 }
  },
  customProfiles: [VideoProfileSchema],
  outProfiles:  {type: Array,  validate: mongooseValidator ({passIfEmpty: true}, 'areIn', outProfiles)},
  inputScripts: [String],
  videoInputs : {audio: {type: Number, default: 0},
                 video: {type: Number, default: 0},
                 text:  {type: Number, default: 0},
                 image: {type: Number, default: 0}},

  inputMedias:  [inputMediaSchema],

  error:        { code: Number, description: String },
  analytics:    {
                  plays:          {type: Number, required: false},
                  CTALinkClicks:  {type: Number, required: false},
                  CTAIconClicks:  {type: Number, required: false},
                  CTAContentShow:  {type: Number, required: false},
                  CTAContentHide:  {type: Number, required: false},
                  engagementRate:  {type: Number, validate: mongooseValidator ({passIfEmpty: true}, 'len', 0, 100)}
                },
  GATrackingCode: {type: String, required: false}           

}, {autoIndex: false, collection: 'templates'});


if (!TemplateSchema.options.toJSON) TemplateSchema.options.toJSON = {};

TemplateSchema.options.toJSON.transform = function (doc, ret, options) {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;
}

var CTAFormInputFieldsSchema = new mongoose.Schema({
  fieldName:     {type:String,required:false},
  fieldType:     {type:String,enum:CTAFormFieldTypes,required:false}
},{autoIndex: false, _id:false });

/*var CTAFormSchema = new mongoose.Schema({
  
},{autoIndex: false, _id:false })*/

var TemplateModel = mongoose.model ('TemplateModel', TemplateSchema);

var VideoSchema = new mongoose.Schema ({

  templateID:     {index:true, type:mongoose.Schema.Types.ObjectId, required: true, ref: 'TemplateModel'},
  accountID:      {index:true, type:mongoose.Schema.Types.ObjectId, required: true},

  date:           {type: Date, default: Date.now },
  name:           {type: String, validate: [videoTitleValidator, 'Bad video name. Check: https://developers.google.com/youtube/v3/docs/videos#snippet.title']},
  description:    {type: String, validate: [videoDescriptionValidator, 'Bad video name. Check: https://developers.google.com/youtube/v3/docs/videos#snippet.description']},
  email:          {type: String, required: false, validate: mongooseValidator ({passIfEmpty: true},'isEmail')},
  firstName:      {type:String,required:false},
  lastName:       {type:String,required:false},
  inputScripts:   [String],
  inputMedias:    [inputMediaSchema],
  inputVariables: {type: Object},
  duration:       Number,
  procTime:       Number,
  status:         { code:  {type: String, enum:videoStatusTypes, required:true, default: 'created'},
                    error: {type: String}
                  },

  videoOutput:  {type       : {type: String, required: false, enum:videoOutputTypes},
                 awsS3Bucket: {type: String},
                 youtube  :   {id:       String,
                               license:  {type: String, required: false, enum:youtubeLicenses},
                               privacy:  {type: String, required: false, enum:youtubePrivacies},
                               category: {type: String, required: false, enum:youtubeCategories},
                               keywords: {type: String, required: false, validate: [tagsValidator, 'Bad youtube keywords. Read: https://developers.google.com/youtube/v3/docs/videos#snippet.tags[]']}
                 }
  },
  keywords:     {type: String, required: false, validate: [tagsValidator, 'Bad video keywords']},

  outFiles:     [VideoFileSchema],
  credits:      Number,
  
  landingInfo:  {
                  logoImageUrl :    {type: String, validate: mongooseValidator ({passIfEmpty: true}, 'isUrl')},
                  bannerImageUrl :  {type: String, validate: mongooseValidator ({passIfEmpty: true}, 'isUrl')},
                  embedIframeUrl :  {type: String, validate: mongooseValidator ({passIfEmpty: true}, 'isUrl')}
                },
  playerInfo:   {
                  CTAType:          {type:String,required:false,enum:CTATypes,'default':'text'},
                  CTACustomHTML:    {type:String,required:false,set: sanitizeHTML,validate:mongooseValidator ({passIfEmpty: true}, 'len', 1, 5000)},
                  CTABodyText :     {type: String, validate: mongooseValidator ({passIfEmpty: true}, 'len', 1, 2000)},
                  CTAButtonText :   {type: String, validate: mongooseValidator ({passIfEmpty: true}, 'len', 1, 2000)},
                  CTAButtonUrl :    {type: String, required: false, validate: mongooseValidator ({passIfEmpty: true}, 'isUrl')},
                  thumbnail :       {type: String, required:false, validate: mongooseValidator ({passIfEmpty: true}, 'isUrl')},
                  CTAStartTime:     {type:Number,required:false},
                  CTAEndTime:       {type:Number,required:false},
                  CTAOpenOnClick:   {type:Boolean,required:false,"default":true},
                  CTAShowOnPause:   {type:Boolean,required:false,"default":true},
                  CTAPauseOnShow:   {type:Boolean,required:false,"default":true},
                  CTAShowAtStart:   {type:Boolean,required:false},
                  CTAShowAtEnd:     {type:Boolean,required:false,"default":true},
                  CTAAllowClose:    {type:Boolean,required:false,"default":true},
                  CTADuration:      {type:Number,required:false},
                  CTAForm:          {title:        {type: String,required:false},
                                     description:  {type: String,set: sanitizeHTML,required:false},
                                     inputFields:  [CTAFormInputFieldsSchema],
                                     required:  {type: Boolean,required:false},
                                     showAtStart: {type: Boolean,required:false},
                                     showAtEnd: {type: Boolean,required:false}

                  }
                },
  analytics:    {
                  plays:          {type: Number, required: false},
                  CTALinkClicks:  {type: Number, required: false},
                  CTAIconClicks:  {type: Number, required: false},
                  CTAContentShow:  {type: Number, required: false},
                  CTAContentHide:  {type: Number, required: false},
                  engagementRate:  {type: Number, validate: mongooseValidator ({passIfEmpty: true}, 'len', 0, 100)}
                },

  data:         {type: Object, validate: [videoDataValidator, 'Video data is too long']},
  formData:     {type: [String], required:false}
  
}, {autoIndex: false, collection: 'videos' } );


if (!VideoSchema.options.toJSON) VideoSchema.options.toJSON = {};
VideoSchema.options.toJSON.transform = function (doc, ret, options) {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;
}

var NotificationSchema = new mongoose.Schema ({

  date:    {type: Date, default: Date.now},
  type:    {type: String, required: true, lowercase: true, enum:notificationTypes},
  message: {type: String, required: true},
  link:    {type: String, required: true}

}, {});

var AccountErrorSchema = new mongoose.Schema ({

  type:     {type: String, required: true, enum:accountErrorType},
  date:     {type: Date, default: Date.now},
  message:  {type: String},
  data:     {type: Object}

}, {});

var AccountTypeSchema = new mongoose.Schema ({

  _id:                {type: String,  unique: true, required: true},
  public:             {type: Boolean, required: true, default: false},
  maxTemplates:       {type: Number,  required: true},
  templateFreeVars:   {type: Number,  required: true},
  videoWaterMark:     {type: Boolean, required: true},
  customFonts:        {type: Boolean, required: true},
  customVideoProfiles:{type: Boolean, required: true, default: false},
  videoProfiles:      {type: Object,  required: true, validate: [profilePriceArrayValidator, 'Profile price array error']},
  mediaStorageSize:   {type: Number,  required: true},
  videoStorageSize:   {type: Number,  required: true},
  processingPriority: {type: Number,  required: true},
  creditsPerPay:      {type: Number,  required: true},
  paymillOfferMonth:  { id:     String,
                        amount: Number
                      },
  paymillOfferYear:   { id:     String,
                        amount: Number
                      },
  extraCreditPrice:   {type: Number,  required: true},
  support:            {type: String, required: true}

}, {autoIndex: false, collection: 'accountTypes'});

AccountTypeSchema.virtual('name').get(function () {
  return this._id;
});

AccountTypeSchema.index ({_id: 1});

var AccountSchema = new mongoose.Schema ({

  active:          {type: Boolean, required: true, default: false},
  activeKey:       {type: String,  required: true},

  name:            {type: String, required: true, validate: mongooseValidator('len', 1, 200)},
  lastname:        {type: String, required: true, validate: mongooseValidator('len', 1, 200)},
  email:           {type: String, unique:true, required: true, index:true, validate: mongooseValidator ('isEmail')},
  password:        {type: String, required: true},
  secret:          {type: String, required: true},
  date:            {type: Date, default: Date.now},
  lastAccess:      {type: Date, default: Date.now},
  mediasSize:      {type: Number, default: 0},
  videosSize:      {type: Number, default: 0},

  _accountType:    {type: String, required: true, ref: exports.AccountTypeModel},

  paymillClientId: {type: String, unique: true},
  paymillToken:    {type: String},
  paymillSubscription : { accountType:          String,
                          period:               String,
                          subscriptionId:       String,
                          updated_at:           Number,
                          next_capture_at:      Number,
                          cancel_at_period_end: Boolean,
                        },

  credits:         {type: Number, default: 0},
  totalCredits:    {type: Number, default: 0},

  youtubeAccounts: [youtubeAccountSchema],
  notifications:   [NotificationSchema],
  errs:            [AccountErrorSchema]

}, {autoIndex: false, collection: 'accounts'});

if (!AccountSchema.options.toJSON) AccountSchema.options.toJSON = {};
AccountSchema.options.toJSON.transform = function (doc, ret, options) {
  ret.id = ret._id;
  delete ret._id;
  delete ret.__v;
}

exports.ApiErrors        = apiErrors;
exports.VideoFormats     = videoFormats;
exports.VideoProfiles    = outProfiles;
exports.MediaModel       = mongoose.model ('media', MediaSchema);
exports.VideoModel       = mongoose.model ('video', VideoSchema);
exports.TemplateModel    = mongoose.model ('template', TemplateSchema);
exports.AccountModel     = mongoose.model ('account', AccountSchema);
exports.AccountTypeModel = mongoose.model ('accountType', AccountTypeSchema);
