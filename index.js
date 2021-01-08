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
        res.render('AddFeedback');
        }else{
            res.redirect('/login')
        }
});

app.get('/listCert', function(req, res){
    if(req.session.iid && (req.session.type == 2)){
        res.render('listCertificates');
        }else{
            res.redirect('/login')
        }
});
app.get('/instructor',function(req,res){
    if(req.session.iid && (req.session.type == 0)){
        res.render('instructor')
        }else{
        res.redirect('/login')
        }
})

app.get('/addCourse', function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    res.render('addingCourse')
}else{
    res.redirect('/login')
}
})

app.get('/defineAssignment',function(req,res){
    if(req.session.iid && (req.session.type == 0)){
        res.render('defineAssignment')
    } else{
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
        console.log(output.table);
        res.render('courses', {data : output.table[0]});
    }
})

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

app.post('/studentViewAssignGrade', async function(req, res){
    let enter = req.body;
    enter.sid = req.session.iid;
    let output = await runProcedure(enter, "viewAssignGrades" , {"assignGrade" : mssql.Int});
    console.log(output);
    res.render('studentViewAssignGrade', {data : output.output});
    console.log(output.output);
});

app.post('/viewAssignContent', async function(req, res){
    let enter = req.body
    enter.sid = req.session.iid
    let output = await runProcedure(enter, "viewAssign");
    console.log(output);
    res.render('studentAssignments', {data : output.table[0][0]});
    console.log(output.table[0][0]);
})

app.post('/register', function(req, res) {
    procName = (req.body.regType == 'true') ? "studentRegister": "InstructorRegister";
    delete req.body["regType"];
    runProcedure(req.body, procName);
    res.redirect('/login');
});

app.post('/submitAssignment', function(req, res){
    procName = "submitAssign";
    let enter = req.body
    enter.sid = req.session.iid
    var procedure = [procName, null, false, true];
    runProcedure(enter, procName);
    res.redirect('/submitAssign');
});

app.post('/feedback', function(req, res){
    procName = "addFeedback";
    let enter = req.body
    enter.sid = req.session.iid
    var procedure = [procName, null, false, true];
    runProcedure(enter, procName);
    res.redirect('/addFeedback');
})

app.post('/listcerti', async function(req, res){
    procName = "viewCertificate";
    let enter = req.body
    enter.sid = req.session.iid
    var procedure = [procName, null, false, true];
    let output = await runProcedure(enter, "viewCertificate");
    console.log(output);
    res.render('studentCertificate', {data : output.table[0][0]});
    console.log(output.table[0][0]);
});

app.post('/login',function(req,res){
    conn.connect();
    runlogin(req,res);
})

app.post('/addingCourse',function(req,res){
    conn.connect();
    procName = "InstAddCourse"
    var news = {instructorId : req.session.iid }
    let enter = {
        ...req.body,
        ...news
    }
    console.log(enter)
    var procedure = [procName, null, false, true];
    runProcedure(enter,procedure)
    res.redirect('/instructor')
})

app.post('/defineAssignment',function(req,res){
    conn.connect();
    procName = "DefineAssignmentOfCourseOfCertianType";
    var news = {instId : req.session.iid }
    let enter = {
        ...req.body,
        ...news
    }
    var procedure = [procName, null, false, true];
    runProcedure(enter,procedure)
    res.redirect('/instructor')
})

app.post('/viewAssign',function(req,res){
    conn.connect();
    procName="InstructorViewAssignmentsStudents";
    conn.connect().then(()=>{
        var request = new mssql.Request(conn);
        request.input('cid',req.body.cid);
        request.input('instrId',req.session.iid);
        request.execute(procName).then(function(done){
        console.log(done)
        res.send(done.output.recordsets)
        }
    ).catch(function (err) {
        console.log(err + " this is error1");
        conn.close();
    })    
})
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
            console.log(recordSet + " this is the record set");
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