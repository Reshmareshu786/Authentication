const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const pathDir = path.join(__dirname, 'userData.db')
const app = express()
app.use(express.json())
const bcrypt = require('bcrypt')
let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: pathDir,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`Db error: ${e.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const validatePassword = password => {
  return password.length > 4
}

app.post('/register', async (request, response) => {
  let {username, name, password, gender, location} = request.body
  let hashedPassword = await bcrypt.hash(password, 10)
  let getRegisteredUsersQuery = `SELECT * FROM user 
    WHERE username = '${username}';`
  const dbUSer = await db.get(getRegisteredUsersQuery)
  if (dbUSer === undefined) {
    let createUserQuery = `INSERT INTO user 
    (username,name,password,gender,location)
    VALUES ('${username}','${name}','${hashedPassword}','${gender}','${location}');`
    if (password.length < 5) {
      response.status(400)
      response.send('Password is too short')
    } else {
      await db.run(createUserQuery)
      response.status(200)
      response.send('User created successfully')
    }
  } else {
    response.status(400)
    response.send('User already exists')
  }
})

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `SELECT * FROM user
  WHERE username = '${username}';`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      response.status(200)
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const selectUserQuery = `SELECT * FROM user
  WHERE username = '${username}';`
  const dbUser = await db.get(selectUserQuery)
  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid User')
  } else {
    const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password)
    if (isPasswordMatched === true) {
      if (validatePassword(newPassword)) {
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        const updatePasswordQuery = `UPDATE user SET 
        password = '${hashedPassword}'
        WHERE username = '${username}';`
        const user = await db.run(updatePasswordQuery)
        response.send('Password updated')
      } else {
        response.status(400)
        response.send('Password is too short')
      }
    } else {
      response.status(400)
      response.send('Invalid current password')
    }
  }
})

module.exports = app
