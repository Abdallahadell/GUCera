const express = require('express');
const mssql = require('mssql');
const app = express();
const port = 3000;
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const { request } = require('express');

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

app.get('/submitAssign', async function(req, res){
    if(req.session.iid && (req.session.type == 2)){
        await conn.connect();
        var request = new mssql.Request(conn);
        try{
            var studQuery = await request.query("select c.name from course c");
        } catch(err){
            console.log(err);
        }
        res.render('submitAssign', {student :studQuery.recordset});
        }
    else{
        res.redirect('/login')
    }
})

app.get('/addFeedback', async function(req, res){
    if(req.session.iid && (req.session.type == 2)){
        await conn.connect();
        var request = new mssql.Request(conn);
        try{
            var studQuery = await request.query("select c.name from course c");
        } catch(err){
            console.log(err);
        }
        res.render('addFeedback', {student :studQuery.recordset});
        }
    else{
        res.redirect('/login')
    }
});

app.get('/addFeedbacksForCourses/:name', async function(req, res){
    if(req.session.iid && (req.session.type == 2)){
        await conn.connect();
        var request = new mssql.Request(conn);
        try {
            request.input('name', req.params.name);
            var queryResult = await request.query("select id from Course where name = @name");
            request.input('cid', queryResult.recordset[0].id);
        } catch (err) {
            console.log(err);
        }
        conn.close();
        res.render('addFeedbacksForCourses', {data : queryResult.recordset[0]});
    }
})

app.get('/listCert', async function(req, res){
    if(req.session.iid && (req.session.type == 2)){
        await conn.connect();
        var request = new mssql.Request(conn);
        try{
            var studQuery = await request.query("select c.name from course c inner join assignment a on c.id = a.cid group by c.name ");
        } catch(err){
            console.log(err);
        }
        res.render('listCertificates', {student :studQuery.recordset});
        }
    else{
        res.redirect('/login')
    }
})

app.get('/studentCertificate/:name', async function(req,res){
    if(req.session.iid && (req.session.type == 2)){
        await conn.connect();
        var request = new mssql.Request(conn);
        try{
            request.input('name', req.params.name);
            var queryResult = await request.query("select id as 'cid' from Course where name = @name");
            request.input('cid', queryResult.recordset[0].cid);
        } catch(err){
            console.log(err);
        }
        conn.close();
        queryResult.recordset[0].Sid = req.session.iid;
        let output = await runProcedure(queryResult.recordset[0], 'viewCertificate', null);
        res.render('studentCertificate',{data: output.table[0]});
        }
    else{
        res.redirect('/login')
    }
})
  
app.get('/studentViewAssignGrade/:name', async function(req, res){
    if(req.session.iid && (req.session.type == 2)){
        await conn.connect();
        var request = new mssql.Request(conn);
        try {
            request.input('name', req.params.name);
            var queryResult = await request.query("select id from Course where name = @name");
            request.input('cid', queryResult.recordset[0].id);
            var assignQuery = await request.query("select a.type as 'assignType', a.number as 'assignnumber', a.cid from Assignment a inner join course C on a.cid = c.id where c.id = @cid");
            var flagQuery = await request.query("select * from assignment a where a.cid = @cid");
            var flag = (flagQuery.recordset.length == 0);
        } catch (err) {
            console.log(err);
        }
        conn.close();
        res.render('studentviewAssignGrade', { Assignment : assignQuery.recordset , assigned : flag , cid : queryResult.recordset[0].id});
    }
});

app.get('/assignContent', async function(req,res){
    if(req.session.iid && (req.session.type == 2)){
        await conn.connect();
        var request = new mssql.Request(conn);
        try{
            var studQuery = await request.query("select c.name from course c inner join studentTakeCourse s on c.id = s.cid");
        } catch(err){
            console.log(err);
        }
        res.render('viewAssign', {student :studQuery.recordset});
        }
    else{
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
    procName="InstructorViewTeachingCourse";
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
        await conn.connect();
        var request = new mssql.Request(conn);
        try{
            request.input('id', req.session.iid);
            var queryResult = await request.query("select mobileNumber from userMobileNumber where id = @id");
            var queryCredit = await request.query("select c.* from creditCard c inner join StudentAddCreditCard sc on c.number = sc.creditCardNumber where sc.sid = @id")
        } catch(err) {
            console.log(err);
        }
        let output = await runProcedure({"id" : req.session.iid}, "viewMyProfile");
        for(key in list = queryCredit.recordset) {
            var date = JSON.stringify(list[key].expiryDate).split("T")[0].substring(1).split("-");
            list[key].expiryDate = date[2] + "/" + date[1] + "/" + date[0];
        }
        res.render('profile', {data : output.table[0][0], number : queryResult.recordset, details : queryCredit.recordset});
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
            request.input('sid', req.session.iid);
            var flagQuery = await request.query("select c.name from course c inner join StudentTakeCourse s on c.id = s.cid where c.name = @cname and s.sid = @sid");
            var flag = (flagQuery.recordset[0].name == req.params.cname);
        } catch(err) {
            console.log(err);
        }
        try {
        } catch (err) {
            
        }
        conn.close();
        let output = await runProcedure(queryResult.recordset[0], 'courseInformation', null);
        res.render('courseDetails', {data : output.table[0][0], instructor : instrQuery.recordset, enrolled : flag});
    }
});

app.get('/studentSubmitAssignments/:name', async function(req,res){
    if(req.session.iid && (req.session.type == 2)){
        await conn.connect();
        var request = new mssql.Request(conn);
        try {
            request.input('name', req.params.name);
            var queryResult = await request.query("select id from Course where name = @name");
            request.input('cid', queryResult.recordset[0].id);
            var assignQuery = await request.query("select a.type as 'assignType', a.number as 'assignnumber', a.cid from Assignment a inner join course C on a.cid = c.id where c.id = @cid");
            var flagQuery = await request.query("select * from assignment a where a.cid = @cid");
            var flag = (flagQuery.recordset.length == 0);
        } catch (err) {
            console.log(err);
        }
        conn.close();
        res.render('studentSubmitAssignments', { Assignment : assignQuery.recordset , assigned : flag , cid : queryResult.recordset[0].id});
    }
});

app.get('/studentAssignments/:name', async function(req, res){
    if(req.session.iid && (req.session.type == 2)){
        await conn.connect();
        var request = new mssql.Request(conn);
        try{
            request.input('name', req.params.name);
            var queryResult = await request.query("select id as 'courseId' from Course where name = @name");
            request.input('courseId', queryResult.recordset[0].courseId);
        } catch(err){
            console.log(err);
        }
        conn.close();
        queryResult.recordset[0].Sid = req.session.iid;
        let output = await runProcedure(queryResult.recordset[0], 'viewAssign', null);
        for(key in list = output.table[0]) {
            var date = JSON.stringify(list[key].deadline).split("T")[0].substring(1).split("-");
            list[key].deadline = date[2] + "/" + date[1] + "/" + date[0];
        }
        res.render('studentAssignments',{data: output.table[0]});
        }
    else{
        res.redirect('/login')
    }
})
  
app.get('/studentViewAssignGrade/:name', async function(req, res){
    if(req.session.iid && (req.session.type == 2)){
        await conn.connect();
        var request = new mssql.Request(conn);
        try {
            request.input('name', req.params.name);
            var queryResult = await request.query("select id from Course where name = @name");
            request.input('cid', queryResult.recordset[0].id);
            var assignQuery = await request.query("select a.type as 'assignType', a.number as 'assignnumber', a.cid from Assignment a inner join course C on a.cid = c.id where c.id = @cid");
            var flagQuery = await request.query("select * from assignment a where a.cid = @cid");
            var flag = (flagQuery.recordset.length == 0);
        } catch (err) {
            console.log(err);
        }
        conn.close();
        res.render('studentviewAssignGrade', { Assignment : assignQuery.recordset , assigned : flag , cid : queryResult.recordset[0].id});
    }
});

app.get('/assignContent', async function(req,res){
    if(req.session.iid && (req.session.type == 2)){
        await conn.connect();
        var request = new mssql.Request(conn);
        try{
            var studQuery = await request.query("select c.name from course c inner join studentTakeCourse s on c.id = s.cid");
        } catch(err){
            console.log(err);
        }
        res.render('viewAssign', {student :studQuery.recordset});
        }
    else{
        res.redirect('/login')
    }
});

app.get('/viewGrade', async function(req, res){
    if(req.session.iid && (req.session.type == 2)){
        await conn.connect();
        var request = new mssql.Request(conn);
        try{
            var studQuery = await request.query("select c.name from course c");
        } catch(err){
            console.log(err);
        }
        res.render('viewGrades', {student :studQuery.recordset});
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

app.get('/viewAssigninst', async function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    conn.connect();
    procName="InstructorViewTeachingCourse";
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
    procName="InstructorViewTeachingCourse";
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
    procName="InstructorViewTeachingCourse";
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
        procName="InstructorViewTeachingCourse";
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
        procName="InstructorViewTeachingCourse";
        var news = {instrId : req.session.iid }
        result1 = await runProcedure(news,procName)
        res.render('courseDescription',{result1:result1.table[0]})
        }else{
        res.redirect('/login')
        }
})
app.get('/addInstructor',async function(req,res){
    if(req.session.iid && (req.session.type == 0)){
        req.session.touch;
        conn.connect();
        procName="InstructorViewTeachingCourse";
        var news = {instrId : req.session.iid }
        result1 = await runProcedure(news,procName)
        res.render('addinstructor',{result1:result1.table[0]})
        }else{
        res.redirect('/login')
        }
})

app.get('/logout',function(req,res){
    req.session.destroy();
    res.redirect('/login');
})

app.get('/promocodes', async function(req, res) {
    if(req.session.iid) {
        req.body.sid = req.session.iid;
        let output = await runProcedure(req.body, 'viewPromocode', null);
        for(key in list = output.table[0]) {
             var date = JSON.stringify(list[key].isuueDate).split("T")[0].substring(1).split("-");
             list[key].isuueDate = date[2] + "/" + date[1] + "/" + date[0];
             var date = JSON.stringify(list[key].expiryDate).split("T")[0].substring(1).split("-");
             list[key].expiryDate = date[2] + "/" + date[1] + "/" + date[0];
        }
        res.render('listPromocodes', {details : output.table[0]});
    } else {
        res.redirect('/login');
    }
});

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
});

app.post('/viewTheGrade/:cid', async function(req,res){
    req.body.sid = req.session.iid;
    req.body.cid = req.params.cid;
    let q = req.body.assign.split("^");
    delete req.body.assign;
    req.body.assignType = q[0];
    req.body.assignnumber = q[1];
    let output = await runProcedure(req.body, 'viewAssignGrades', {"assignGrade" : mssql.Int});
    res.render('viewAssignGrades', {data : output.output});
})

app.post('/feedback/:cid', function(req, res){
    req.body.sid = req.session.iid;
    req.body.cid = req.params.cid;
    runProcedure(req.body, 'addFeedback')
    res.redirect('/addFeedback')
})

app.post('/submit/:cid', function(req, res){
    req.body.sid = req.session.iid;
    req.body.cid = req.params.cid;
    /*for(i = 0; i<req.body.assign.length; i++){
        if(req.body.assign.charAt[i].equals"^")
    }*/
    let q = req.body.assign.split("^");
    delete req.body.assign;
    req.body.assignType = q[0];
    req.body.assignnumber = q[1];
    runProcedure(req.body, 'submitAssign');
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
    res.redirect('/updateCourseDescription')
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

app.post('/viewAssigninst',async function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    conn.connect();
    procName1="InstructorViewTeachingCourse";
    result1 = await runProcedure({instrId : req.session.iid},procName1)
    procName="InstructorViewAssignmentsStudents";
    var news = {instrId : req.session.iid }
    let enter = {
        ...req.body,
        ...news
    }
    result = await runProcedure(enter,procName)
    res.render('viewAssigninst',{result : result.table[0],result1:result1.table[0]})
    }else{
    res.redirect('/login')
    }
})

app.post("/viewFeedback", async function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    conn.connect();
    procName1="InstructorViewTeachingCourse";
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

app.post("/addInstructor",function(req,res){
    if(req.session.iid && (req.session.type == 0)){
    req.session.touch;
    procName = "AddAnotherInstructorToCourse"
    var news = {adderIns : req.session.iid }
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

app.post("/addPhoneNumber", async function(req,res){
    if(req.session.iid){
        req.session.touch;
        procName = "addMobile"
        var news = {ID : req.session.iid }
        let enter = {
            ...req.body,
            ...news
        }
        await runProcedure(enter,procName)
        if(req.session.type == 0){
            res.redirect('/instructorProfile')
        }
        else if(req.session.type == 2){
            res.redirect('/profile')
        }
        }else{
            res.redirect('/login')
        }
})

app.post("/removePhone", async function(req, res) {
    if(req.session.iid){
        req.session.touch();
        await conn.connect();
        var request = new mssql.Request(conn);
        try {
            request.input('id', req.session.iid);
            request.input('remove', req.body.remove);
            await request.query("delete from UserMobileNumber where id = @id and mobileNumber = @remove");
        } catch (err) {
            console.log(err);
        }
        res.redirect('/profile');
    } else {
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

app.post("/addCreditCard", async function(req, res) {
    if(req.session.iid) {
        req.session.touch();
        req.body.sid = req.session.iid;
        req.body.cardHolderName = req.body.name;
        delete req.body.name;
        req.body.expiryDate = req.body.date;
        delete req.body.date;
        await runProcedure(req.body, 'addCreditCard', null);
        res.redirect('/profile');
    } else {
        res.redirect('/login');
    }
});

app.post("/removeCreditCard", async function(req, res) {
    if(req.session.iid){
        req.session.touch();
        await conn.connect();
        var request = new mssql.Request(conn);
        try {
            request.input('id', req.session.iid);
            request.input('removeCard', req.body.removeCard);
            await request.query("delete from StudentAddCreditCard where sid = @id and creditCardNumber = @removeCard");
        } catch (err) {
            console.log(err);
        }
        res.redirect('/profile');
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

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});