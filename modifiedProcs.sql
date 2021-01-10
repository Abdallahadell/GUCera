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


GO


CREATE PROC availableCourses
AS
SELECT Course.name FROM Course LEFT OUTER JOIN StudentTakeCourse ON Course.id = StudentTakeCourse.cid 
LEFT OUTER JOIN Student ON StudentTakeCourse.sid = Student.id
WHERE Course.accepted = '1'

go