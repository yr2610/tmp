// 以下のショートカットで32bit版を実行する必要がある
// https://social.msdn.microsoft.com/Forums/windowsapps/ja-JP/42b39f75-79ea-483d-a86d-fbbe3e73690d/windows8-64bit?forum=vbgeneralja
// wsf ファイルのショートカットを作ってリンク先を
// %windir%\SysWOW64\wscript.exe [wsfファイルのフルパス]
// みたいな感じに修正して実行

var shell = new ActiveXObject("WScript.Shell");
var shellApplication = new ActiveXObject("Shell.Application");
var fso = new ActiveXObject( "Scripting.FileSystemObject" );
var stream = new ActiveXObject("ADODB.Stream");

function myError(message) {
    shell.Popup(message, 0, "エラー", ICON_EXCLA);
    WScript.Quit(1);
}


function yyyymmddhhmmss(date) {
    // 1桁の数字を0埋めして2桁に
    function zeroPadding(value) {
      return ('0' + value).slice(-2);
      //return (value < 10) ? "0" + value : value;
    }
    var sa = [
        date.getFullYear(),
        '-',
        zeroPadding(date.getMonth() + 1),
        '-',
        zeroPadding(date.getDate()),
        ' ',
        zeroPadding(date.getHours()),
        ':',
        zeroPadding(date.getMinutes()),
        ':',
        zeroPadding(date.getSeconds())
    ];
    return sa.join("");
}

function yyyymmdd(date, delimiter) {
    // 1桁の数字を0埋めして2桁に
    function zeroPadding(value) {
      return ('0' + value).slice(-2);
      //return (value < 10) ? "0" + value : value;
    }
    var sa = [
        date.getFullYear(),
        delimiter,
        zeroPadding(date.getMonth() + 1),
        delimiter,
        zeroPadding(date.getDate()),
    ];
    return sa.join("");
}

//WScript.Echo(JSON.stringify(new Date(), undefined, 4));
//WScript.Echo(yyyymmddhhmmss(new Date()));
//WScript.Quit(1);


if (WScript.Arguments.length != 2 ||
    WScript.Arguments.Unnamed(0) == "" ||
    WScript.Arguments.Unnamed(1) == "") {
    myError("以下のファイルを複数選択した状態でドラッグ＆ドロップしてください。\n\n* xml\n* yml");
}

var dataFilePath = WScript.Arguments.Unnamed(0);
var xmlFilePath = WScript.Arguments.Unnamed(1);

if (fso.GetExtensionName(dataFilePath) !== "yml") {
    var t = xmlFilePath;
    xmlFilePath = dataFilePath;
    dataFilePath = t;
}

if (fso.GetExtensionName(dataFilePath) != "yml") {
    myError("以下のファイルがドロップされていません。\n\n* yml");
}

if (fso.GetExtensionName(xmlFilePath) != "xml") {
    myError("以下のファイルがドロップされていません。\n\n* xml");
}

function loadXMLFile(filePath) {
    stream.Type = adTypeText;
    stream.charset = "UTF-8";
    stream.Open();
    stream.LoadFromFile(filePath);
    var allLines = stream.ReadText(adReadAll);
    stream.Close();

    return allLines;
}

// 拡張子だけ変える
function getExtensionChangedFileName(filePath, ext) {
    var fso = new ActiveXObject( "Scripting.FileSystemObject" );
    var outFilename = fso.GetBaseName(filePath) + "." + ext;
    return fso.BuildPath(fso.GetParentFolderName(filePath), outFilename);
}

function saveTextToFile(filePath, s) {
    stream.Type = adTypeText;
    stream.charset = "utf-8";
    stream.Open();

    stream.WriteText(s, adWriteLine);
    
    stream.SaveToFile(filePath, adSaveCreateOverWrite);
    stream.Close();
}

function readTextFileUTF8(filePath) {
    var stream = new ActiveXObject("ADODB.Stream");
  
    stream.Type = adTypeText;
    stream.charset = "utf-8";
    stream.Open();
    stream.LoadFromFile(filePath);
    var s = stream.ReadText(adReadAll);
    stream.Close();
  
    return s;
}

function readYAMLFile(yamlFilePath) {
    var s = readTextFileUTF8(yamlFilePath);
  
    return jsyaml.safeLoad(s);
}

var data = readYAMLFile(dataFilePath);

// 循環しないように
// 循環の対処はしないので、無限ループになる
function processIncludeFiles(data) {
    if (_.isUndefined(data.$include)) {
        return;
    }

    var includeFiles = data.$include;
    delete data.$include;
    _.forEach(includeFiles, function(value) {
        var includeFilePath = fso.BuildPath(fso.GetParentFolderName(dataFilePath), value);
        var includeData = readYAMLFile(includeFilePath);
        _.assign(data, includeData);
    });

    processIncludeFiles(data);
}

processIncludeFiles(data);

//WScript.Echo(JSON.stringify(data, undefined, 4));

data.processedDate = yyyymmddhhmmss(new Date());
data.today = yyyymmdd(new Date(), ".");

// テンプレート変数の文字列に他のテンプレート変数が含まれているの対応
_.forEach(data, function(value, key) {
    var _compile = template(value);

    data[key] = _compile(data);
});

// doclink {
//    document
//    view
//    database
//    description
//    server
//}

///
var xml = new ActiveXObject("Microsoft.XMLDOM");
xml.async = false;
xml.load(xmlFilePath);

var $xml = $(xml);

//WScript.Echo(xml.getElementsByTagName('doclink').length);

// par
// par/run
// item/textlist/text
//$xml.find("doclink").each(function(i, o) {
//    var s = "";
//    $.each(o.attributes, function(ii, e) {
//        // this.attributes is not a plain object, but an array
//        // of attribute nodes, which contain both the name and value
//        //if (e.specified) {
//            s += e.name + " : " + e.value + "\n";
//        //}
//    });
//    //WScript.Echo(s);
//});
(function(){
    var s = "";
    //$xml.find("par, item").each(function(i, o) {
    //$xml.find("par").each(function(i, o) {
    // 完全一致じゃなくても含んでいるノードを検出できる
    $xml.find("par run:contains('{{=')").each(function(i, o) {
        var t = $(o).text();
        //var t = o.textContent;
        //if (t.indexOf('{{=') == -1) {
        //    return;
        //}
        //s += o.nodeName + ":" + t + "\n";
        $(o).text("***" + t);
    });
    //WScript.Echo(s);
})();

var outFilename = fso.GetBaseName(xmlFilePath) + "-saved.xml";
outFilename = fso.BuildPath(fso.GetParentFolderName(xmlFilePath), outFilename);

$xml[0].save(outFilename);

WScript.Echo("done.");
WScript.Quit(1);
///


var dxl = loadXMLFile(xmlFilePath);

_.templateSettings = {
    evaluate: /\{\{([\s\S]+?)\}\}/g,
    interpolate: /\{\{=([\s\S]+?)\}\}/g,
    escape: /\{\{-([\s\S]+?)\}\}/g
};

var template = _.template;
var compile = template(dxl);

// TODO: 現在の日時入れる
//data.translated = ;

//WScript.Echo(JSON.stringify(data, undefined, 4));

var processedDxl = compile(data);

var outFilename = fso.GetBaseName(xmlFilePath) + "-processed.xml";
outFilename = fso.BuildPath(fso.GetParentFolderName(xmlFilePath), outFilename);

saveTextToFile(outFilename, processedDxl);

WScript.Echo("done");
