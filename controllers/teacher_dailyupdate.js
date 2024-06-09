const { closeDatabaseConnection } = require('../middleware/database');
const { collegePool } = require('../config/dbconfig');

const DailyUpdates= async (req, res) => {
    const { stand, division, subject_code_prefixed, chapter_id, point_ids, date, time } = req.body;
  
    if (!stand || !division || !subject_code_prefixed || !chapter_id || !Array.isArray(point_ids) || point_ids.length === 0 || !date || !time) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
  
    let connection;
  
    try {
      
      // Insert into Teacher_dailyUpdate
      const insertTeacherDailyUpdate = `INSERT INTO Teacher_dailyUpdate (stand, division, subject_code_prefixed, chapter_id, date, time) VALUES (?, ?, ?, ?, ?, ?)`;
      const [result] = await req.collegePool.query(insertTeacherDailyUpdate, [stand, division, subject_code_prefixed, chapter_id, date, time]);
  
      
      const update_id = result.insertId;
  
      // Prepare to insert into daily_update_points
      const insertDailyUpdatePoints = `INSERT INTO daily_update_points (update_id, point_id) VALUES ?`;
      const dailyUpdatePointsValues = point_ids.map(point_id => [update_id, point_id]);
  
      await req.collegePool.query(insertDailyUpdatePoints, [dailyUpdatePointsValues]);

      res.json({ success: true, message: 'Data inserted successfully.' });
    } catch (error) {
      console.error('Error inserting data:', error);
      if (connection) await connection.rollback();
      res.status(500).json({ success: false, message: 'Error inserting data.' });
    } finally {
      if (connection) connection.release();
    }
  };





const getTeacherDailyUpdate=async (req, res) => {
    try {
        const query=
           ` SELECT 
                t.update_id, t.stand, t.division, t.subject_code_prefixed, t.chapter_id, t.date, t.time,
                c.chapter_name, 
                JSON_ARRAYAGG(p.point_name) AS points
            FROM 
                Teacher_dailyUpdate t
            JOIN 
                syallabus.chapter c ON t.chapter_id = c.chapter_id
            LEFT JOIN 
                daily_update_points dup ON t.update_id = dup.update_id
            LEFT JOIN 
                syallabus.Points p ON dup.point_id = p.point_id
            GROUP BY 
                t.update_id
        `;
        const [rows] = await req.collegePool.query(query);

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
};

module.exports = {
    DailyUpdates,
    getTeacherDailyUpdate
};