const express = require('express');
const mssql = require('mssql');
const app = express();
const port = 3000;
const path = require('path');
const fs = require('fs');
const session = require('express-session');

app.use(session({ secret: 'keyboard cat',resave:false,rolling:true,saveUninitialized:false, cookie: { maxAge: 180000}}));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('styles', path.join(__dirname, 'styles'));
app.set('view engine','ejs');

var read = fs.readFileSync("config.json");
var config = JSON.parse(read);
var conn = new mssql.ConnectionPool(config);

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', function(req, res) {
    res.render('login',{error:""});
});

app.get('/registration', function(req, res) {
    res.render('registration');
});

app.get('/student', function(req, res) {
    if(req.session.iid && (req.session.type == 2)){
        res.render('student');
    } else{
        res.redirect('/login')
    }
});

app.get('/submitAssign', function(req, res){
    if(req.session.iid && (req.session.type == 2)){
    res.render('submitAssign');
    }else{
    res.redirect('/login')
    }
})

app.get('/addFeedback', function(req, res){
    if(req.session.iid && (req.session.type == 2)){
        req.session.touch;
        res.render('AddFeedback');
        }else{
            res.redirect('/login')
        }
})

app.get('/listCert', function(req, res){
    if(req.session.iid && (req.session.type == 2)){
        res.render('listCertificates');
        }else{
            res.redirect('/login')
        }
})

app.get('/instructor',function(req,res){
    if(req.session.iid && (req.session.type == 0)){
        req.session.touch;
        res.render('instructor')
        }else{
        res.redirect('/login')
        }
})

app.get('/addCourse', function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    res.render('addingCourse')
    }else{
    res.redirect('/login')
}
})

app.get('/defineAssignment',async function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    conn.connect();
    procName="InstructorViewAcceptedCoursesByAdmin";
    var news = {instrId : req.session.iid }
    let enter = {
        ...req.body,
        ...news
    }
    result = await runProcedure(enter,procName)
    res.render('defineAssignment',{result:result.table[0]})
    }else{
    res.redirect('/login')
}
})

app.get('/profile', async function (req, res){
    if(req.session.iid) {
        let output = await runProcedure({"id" : req.session.iid}, "viewMyProfile");
        res.render('profile', {data : output.table[0][0]});
    }
})

app.get('/courses', async function (req, res){
    if(req.session.iid && req.session.type == 2) {
        let output = await runProcedure(null, 'availableCourses', null);
        res.render('courses', {data : output.table[0]});
    }
})

app.get('/courseDetails/:cname', async function (req, res) {
    if(req.session.iid) {
        await conn.connect();
        var request = new mssql.Request(conn);
        try{
            request.input('cname', req.params.cname);
            var queryResult = await request.query("select id from Course where name = @cname");
            request.input('cid', queryResult.recordset[0].id);
            var instrQuery = await request.query("select i.insid, u.firstName + ' ' + u.lastName as 'name' from InstructorTeachCourse i inner join Users u on i.insid = u.id where cid = @cid");
        } catch(err) {
            console.log(err);
        }
        conn.close();
        let output = await runProcedure(queryResult.recordset[0], 'courseInformation', null);
        res.render('courseDetails', {data : output.table[0][0], instructor : instrQuery.recordset});
    }
});
  
app.get('/assignContent', function(req,res){
    if(req.session.iid && (req.session.type == 2)){
        res.render('viewAssign')
        }
    else{
        res.redirect('/login')
    }
});

app.get('/viewGrade', function(req, res){
    if(req.session.iid && (req.session.type == 2)){
        res.render('viewGrades')
        }
    else{
        res.redirect('/login')
    }
})

app.get('/instructorProfile',async function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    conn.connect();
    procName="ViewInstructorProfile";
    var news = {instrId : req.session.iid }
    result = await runProcedure(news,procName)
    res.render('instructorProfile',{result : result.table[0][0]})
    }else{
    res.redirect('/login')
    }
})
app.post('/studentViewAssignGrade', async function(req, res){
    let enter = req.body;
    enter.sid = req.session.iid;
    let output = await runProcedure(enter, "viewAssignGrades" , {"assignGrade" : mssql.Int});
    res.render('studentViewAssignGrade', {data : output.output});
});

app.post('/viewAssignContent', async function(req, res){
    let enter = req.body
    enter.sid = req.session.iid
    let output = await runProcedure(enter, "viewAssign");
    res.render('studentAssignments', {data : output.table[0][0]});
})

app.get('/viewAssigninst', async function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    conn.connect();
    procName="InstructorViewAcceptedCoursesByAdmin";
    var news = {instrId : req.session.iid }
    let enter = {
        ...req.body,
        ...news
    }
    result1 = await runProcedure(enter,procName)
    res.render('viewAssigninst',{result:"",result1:result1.table[0]})
    }else{
    res.redirect('/login')
    }
})

app.get('/IssueCertificate',async function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;    
    conn.connect();
    procName="InstructorViewAcceptedCoursesByAdmin";
    var news = {instrId : req.session.iid }
    let enter = {
        ...req.body,
        ...news
    }
    result = await runProcedure(enter,procName)
    res.render('issueCertificate',{result:result.table[0]})
    }else{
    res.redirect('/login')    
    }
})

app.get('/viewFeedback', async function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    conn.connect();
    procName="InstructorViewAcceptedCoursesByAdmin";
    var news = {instrId : req.session.iid }
    result1 = await runProcedure(news,procName)
    res.render('viewFeedback',{result:"",result1:result1.table[0]})
    }else{
    res.redirect('/login')
    }
})

app.get('/updateContent',async function(req,res){
    if(req.session.iid && (req.session.type == 0)){
        req.session.touch;
        conn.connect();
        procName="InstructorViewAcceptedCoursesByAdmin";
        var news = {instrId : req.session.iid }
        result1 = await runProcedure(news,procName)
        res.render('updateContent',{result1:result1.table[0]})
        }else{
        res.redirect('/login')
        }
})

app.get('/updateCourseDescription',async function(req,res){
    if(req.session.iid && (req.session.type == 0)){
        req.session.touch;
        conn.connect();
        procName="InstructorViewAcceptedCoursesByAdmin";
        var news = {instrId : req.session.iid }
        result1 = await runProcedure(news,procName)
        res.render('courseDescription',{result1:result1.table[0]})
        }else{
        res.redirect('/login')
        }
})

app.post('/register', function(req, res) {
    procName = (req.body.regType == 'true') ? "studentRegister": "InstructorRegister";
    delete req.body["regType"];
    runProcedure(req.body, procName);
    res.redirect('/login');
});

app.post('/enroll/:cid', function(req, res) {
    req.body.sid = req.session.iid;
    req.body.cid = req.params.cid
    runProcedure(req.body, 'enrollInCourse');
    res.redirect("/courses");
})

app.post('/submitAssignment', function(req, res){
    procName = "submitAssign";
    let enter = req.body
    enter.sid = req.session.iid
    var procedure = [procName, null, false, true];
    runProcedure(enter, procName);
    res.redirect('/submitAssign');
});

app.post('/feedback', function(req, res){
    if(req.session.iid && (req.session.type == 2)){
    req.session.touch;
    procName = "addFeedback";
    let enter = req.body
    enter.sid = req.session.iid
    var procedure = [procName, null, false, true];
    runProcedure(enter, procName);
    res.redirect('/addFeedback');
    }else{
    res.redirect('/login')
    }
})

app.post('/listcerti', async function(req, res){
    procName = "viewCertificate";
    let enter = req.body
    enter.sid = req.session.iid
    var procedure = [procName, null, false, true];
    let output = await runProcedure(enter, "viewCertificate");
    res.render('studentCertificate', {data : output.table[0][0]});
})

app.post('/login',function(req,res){
    conn.connect();
    runlogin(req,res);
})

app.post('/addingCourse',function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    procName = "InstAddCourse";
    var news = {instructorId : req.session.iid };
    let enter = {
        ...req.body,
        ...news
    }
    runProcedure(enter,procName)
    res.redirect('/instructor')
    }else{
    res.redirect('/login')
    }
})

app.post('/defineAssignment',function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    procName = "DefineAssignmentOfCourseOfCertianType";
    var news = {instId : req.session.iid }
    let enter = {
        ...req.body,
        ...news
    }
    runProcedure(enter,procName)
    res.redirect('/instructor')
    }else{
    res.redirect('/login')
    }
})

app.post('/viewAssigninst',async function(req, res) {
    if(req.session.iid && (req.session.type == 0)) {
        req.session.touch;
        procName1="InstructorViewAcceptedCoursesByAdmin";
        result1 = await runProcedure({instrId : req.session.iid},procName1)
        procName="InstructorViewAssignmentsStudents";  
        var news = {instrId : req.session.iid }
        let enter = {
            ...req.body,
            ...news
        }
        result = await runProcedure(enter,procName)
            res.render('viewAssigninst',{result : result.table[0],result1:result1.table[0]})
    } else {
        res.redirect('/login')
    }
})

app.post("/viewFeedback", async function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    conn.connect();
    procName1="InstructorViewAcceptedCoursesByAdmin";
    result1 = await runProcedure({instrId : req.session.iid},procName1)
    procName="ViewFeedbacksAddedByStudentsOnMyCourse";
    var news = {instrId : req.session.iid }
    let enter = {
        ...req.body,
        ...news
    }
    result = await runProcedure(enter,procName)
    res.render('viewFeedback',{result : result.table[0],result1:result1.table[0]})
    }else{
    res.redirect('/login')
    }
})

app.post("/issueCertificate",function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    procName = "InstructorIssueCertificateToStudent";
    var news = {insId: req.session.iid, issueDate : new Date() }
    let enter = {
        ...req.body,
        ...news
    }
    runProcedure(enter,procName)
    res.redirect('/instructor')
    }else{
    res.redirect('/login')
    }
})
  
app.post("/gradeAssignment",function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    procName = "InstructorgradeAssignmentOfAStudent";
    var news = {instrId : req.session.iid }
    let enter = {
        ...req.body,
        ...news
    }
    runProcedure(enter,procName)
    res.redirect('/instructor')
    }else{
    res.redirect('/login')
    }
})

app.post("/updateContent",function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    procName = "UpdateCourseContent"
    var news = {instrId : req.session.iid }
    let enter = {
        ...req.body,
        ...news
    }
    runProcedure(enter,procName)
    res.redirect('/instructor')
    }else{
    res.redirect('/login')
    }
})

app.post("/updateCourseDescription",function(req,res){
    if(req.session.iid && (req.session.type == 0)){
        req.session.touch;
        procName = "UpdateCourseDescription"
        var news = {instrId : req.session.iid }
        let enter = {
            ...req.body,
            ...news
        }
        runProcedure(enter,procName)
        res.redirect('/instructor')
        } else {
            res.redirect('/login')
        }
})

function runlogin(req,res){
    conn.connect().then(() => {
    var request = new mssql.Request(conn);
    request.input('id',req.body.id)
    request.input('password',req.body.password)
    request.output('success',mssql.Bit)
    request.output('type',mssql.Int)
    request.execute("userLogin").then(function(done){
            if(done.output.success == 1){
                req.session.iid = req.body.id;
                req.session.type = done.output.type;
                if(done.output.type == 0){
                    res.redirect('/instructor');
                    conn.close();
                }
                else if(done.output.type == 1){
                    res.redirect('/Admin');
                    conn.close();
                }
                else if(done.output.type==2){
                    res.redirect('/Student');
                    conn.close();
                }
            }
            else{
                res.render('login',{error:"The username or password is incorrect"})
                conn.close();
            }
        }).catch(function (err) {
            console.log(err + " this is error1");
            conn.close();
        });
    
}).catch(function (err) {
    console.log(err + " this is error2");
    conn.close();
});
}

async function runProcedure(body, proc, expected_outputs) {
    var inputs = []
    for (var key in body){
        input = [key, body[key], false, false];
        inputs.push(input);
    }
    for (var output in expected_outputs){
        output = [output, expected_outputs[output], true, false];
        inputs.push(output);
    }
    inputs.push([proc, null, false, true]);
    // inputs[input][3] corresponds to a output statement
    // inputs[input][4] corresponds to an execute statement
    await conn.connect()
    var request = new mssql.Request(conn);
    for (input in inputs){
        if (!inputs[input][2] && !inputs[input][3]){
            request.input(inputs[input][0], inputs[input][1])
        }
        else if(inputs[input][2]){
            request.output(inputs[input][0], inputs[input][1])
        }
        else{
            try {
                let recordSet = await request.execute(inputs[input][0]);
                conn.close();
                var result = {
                    table : recordSet.recordsets ,
                    output : recordSet.output
                }
                return result;
                
            } catch (error) {
               console.log(error);
               return; 
            }
        }
    }
}

app.get('/logout',function(req,res){
    req.session.destroy();
    res.redirect('/login');
})

function runStudentRegister(req) {
    conn.connect().then(function () {
        var request = new mssql.Request(conn);
        request.input('first_name', req.body.firstName);
        request.input('last_name', req.body.lastName);
        request.input('password', req.body.password);
        request.input('email', req.body.email);
        request.input('gender', req.body.gender);
        request.input('address', req.body.address);
        request.execute("studentRegister").then(function (recordSet) {
            conn.close();
        }).catch(function (err) {
            console.log(err + " this is error1");
            conn.close();
        });
    }).catch(function (err) {
        console.log(err + " this is error2");
    });
}

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});