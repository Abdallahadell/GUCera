CREATE PROC courseInformation
@id int
AS
IF(EXISTS(SELECT * FROM Course WHERE id = @id))
BEGIN
SELECT Course.id as 'Course ID', Course.name as 'Course Name', course.courseDescription as 'Description', course.creditHours as 'Credit Hours',
		course.price as 'Price', course.content as 'Content', course.accepted as 'Accepted',  Users.firstName + ' ' + Users.lastName as 'Instructor Name',
		course.instructorId as 'Instructor ID', course.adminId as 'Admin ID' FROM Course  INNER JOIN Instructor ON Course.instructorId = Instructor.id 
INNER JOIN Users ON Instructor.id = Users.id
WHERE Course.id = @id
END

GO


CREATE PROC availableCourses
AS
SELECT Course.name FROM Course LEFT OUTER JOIN StudentTakeCourse ON Course.id = StudentTakeCourse.cid 
LEFT OUTER JOIN Student ON StudentTakeCourse.sid = Student.id
WHERE Course.accepted = '1'

go

CREATE PROC submitAssign
@assignType VARCHAR(10),
@assignnumber int,
@sid INT,
@cid INT
AS
BEGIN
IF (EXISTS(SELECT * FROM StudentTakeCourse WHERE cid = @cid AND sid = @sid ))
    BEGIN
        IF (EXISTS(SELECT * FROM StudentTakeAssignment WHERE assignmenttype = @assignType AND assignmentNumber = @assignnumber))
            print 'Already submitted'
        ELSE
            INSERT INTO StudentTakeAssignment values (@sid,@cid,@assignnumber,@assignType,null)
END
ELSE
    print 'not enrolled in course'
END
GO

CREATE Proc DefineAssignmentOfCourseOfCertianType
@instId int,
@cid int ,
@number int,
@type varchar(10),
@fullGrade int,
@weight decimal(4,1),
@deadline datetime,
@content varchar(200)
As
if(exists(select * from Course c inner join InstructorTeachCourse e ON c.id=e.cid  where id=@cid and e.insid =@instId))
Insert into Assignment values (@cid ,@number,@type,@fullGrade,@weight ,@deadline ,@content)
