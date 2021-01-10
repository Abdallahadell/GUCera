USE GUCera
GO
CREATE Proc InstructorViewTeachingCourse
@instrId int
As
Select c.id ,c.name, c.creditHours
From Course c inner join InstructorTeachCourse e ON c.id=e.cid
Where e.insid=@instrId
