require("dotenv").config()
const cookieParser = require("cookie-parser")
const express = require("express");
const bcrypt = require("bcrypt");
const sanitizeHTML = require("sanitize-html");
const jwt = require("jsonwebtoken");
const app = express();
const db = require("better-sqlite3")("ourApp.db")
db.pragma("journal_mode = WAL")
app.set("view engine", "ejs")
app.use(express.urlencoded({ extended: false }))
app.use(express.static("public"))
app.use(cookieParser())


// DB
const createTables = db.transaction(() => {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username STRING NOT NULL UNIQUE,
            password STRING NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        `).run()

        db.prepare(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title STRING NOT NULL,
            body TEXT NOT NULL,
            createdDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            authorid INTEGER,
            FOREIGN KEY (authorid) REFERENCES users(id)
        )
        `).run()

})

createTables()

// DB END



app.use(function (req, res, next){
    res.locals.errors = []

    try{
        const decoded = jwt.verify(req.cookies.ourSimpleApp, process.env.JWTSECRET)
        req.user = decoded
    } catch (err) {
        req.user = false
    }

    res.locals.user = req.user
    next()

})

function mustBeLoggedIn(req, res, next){
    if (req.user){
        return next()
    }
    return res.redirect("/login")

}

function sharedPostValidation(req) {

    const errors = []

    if(typeof req.body.title !== "string") req.body.title = ""
    if(typeof req.body.body !== "string") req.body.body = ""

    if(!req.body.title) errors.push("Title is required")
    if(!req.body.body) errors.push("Body is required")

    req.body.title = sanitizeHTML(req.body.title.trim(), {allowedTags: [], allowedAttributes: {}})
    req.body.body = sanitizeHTML(req.body.body.trim(), {allowedTags: [], allowedAttributes: {}})
    return errors
}

app.get("/post/:id", (req, res) => {

    const statement = db.prepare("SELECT posts.*, users.username FROM posts INNER JOIN users ON posts.authorid = users.id WHERE posts.id = ?")
    const post = statement.get(req.params.id)

    if (!post) {
        return res.redirect("/")
    }
    const isAuthor = req.user && req.user.userid === post.authorid

    res.render("single-post", { post, isAuthor })
})

app.post("/create-post", mustBeLoggedIn ,(req, res) => {

    const errors = sharedPostValidation(req)
    if (errors.length) {
        return res.render("create-post", {errors})
    }

    const ourStatement = db.prepare("INSERT INTO posts (title,body,authorid, createdDate) VALUES (?, ?, ?, ?)")
    const result = ourStatement.run(req.body.title, req.body.body, req.user.userid, new Date().toISOString())

    const getPostStatement = db.prepare("SELECT * FROM posts WHERE id = ?")
    const realPost = getPostStatement.get(result.lastInsertRowid)

    res.redirect(`/post/${realPost.id}`)

    

})


app.get("/edit-post/:id", mustBeLoggedIn, (req, res) => {

    const statement = db.prepare("SELECT * FROM posts WHERE id = ?")
    const post = statement.get(req.params.id)
    if (post.authorid !== req.user.userid) {
        return res.redirect("/")
    }
    res.render("edit-post", {post})
})

app.post("/edit-post/:id",mustBeLoggedIn,(req, res) => {
    
    const statement = db.prepare("SELECT * FROM posts WHERE id = ?")
    const post = statement.get(req.params.id)
    if (post.authorid !== req.user.userid) {
        return res.redirect("/")
    }
    

    const errors = sharedPostValidation(req)
    if (errors.length) {
        return res.render("edit-post", {errors})
    }

    const updateStatement = db.prepare("UPDATE posts SET title = ?, body = ? WHERE id = ?")
    updateStatement.run(req.body.title, req.body.body, req.params.id)

    res.redirect(`/post/${req.params.id}`)

})

app.post("/delete-post/:id", mustBeLoggedIn,(req, res) => {

    const statement = db.prepare("SELECT * FROM posts WHERE id = ?")
    const post = statement.get(req.params.id)
    if (post.authorid !== req.user.userid) {
        return res.redirect("/")
    }
    

    const deleteStatement = db.prepare("DELETE FROM posts WHERE id = ?")
    deleteStatement.run(req.params.id)

    res.redirect("/")
})

app.get("/create-post", mustBeLoggedIn, (req, res) => {

    res.render("create-post")
})

app.get("/", (req, res) => {
  if (req.user) {
  const postsStatement = db.prepare("SELECT * FROM posts WHERE authorid = ?");
  const posts = postsStatement.all(req.user.userid);

  const randomPostStmt = db.prepare(`
    SELECT posts.*, users.username 
    FROM posts 
    JOIN users ON posts.authorid = users.id 
    ORDER BY RANDOM() LIMIT 1
  `);
  const randomPost = randomPostStmt.get();

  return res.render("dashboard", { posts, user: req.user, randomPost });
}



  const randomPostStmt = db.prepare(`
    SELECT posts.*, users.username 
    FROM posts 
    JOIN users ON posts.authorid = users.id 
    ORDER BY RANDOM() LIMIT 1
  `);
  const randomPost = randomPostStmt.get();

  res.render("homepage", {
    randomPost,
    errors: [] // Required for the register form
  });
});


app.get("/logout", (req, res) => {

    res.clearCookie("ourSimpleApp")
    res.redirect("/")
})

app.get("/login", (req, res) => {
    res.render("login")
})

app.post("/login", (req, res) => {
    const errors = []

    if (typeof req.body.username !== "string") req.body.username = ""
    if (typeof req.body.password !== "string") req.body.password = ""

    if(req.body.username.trim() === "") errors.push("Username is required")
    if(req.body.password === "") errors.push("Password is required")

    if(errors.length){
        return res.render("login", {errors})
    }
    
    const userInQuestionStatement = db.prepare("SELECT * FROM users WHERE username = ?")
    const userInQuestion = userInQuestionStatement.get(req.body.username)

    if (!userInQuestion) {
        errors.push("Username or password is incorrect")
        return res.render("login", {errors})
    }
        const matchOrNot = bcrypt.compareSync(req.body.password, userInQuestion.password)
        if (!matchOrNot) {
            errors.push("Username or password is incorrect")
            return res.render("login", {errors})}



        const ourTokenValue = jwt.sign({exp: Math.floor(Date.now()/1000) + 60*60*24,skyColor: "blue", userid: userInQuestion.id, username: userInQuestion.username} , process.env.JWTSECRET)

            res.cookie("ourSimpleApp", ourTokenValue, {

                httpOnly: true,
                secure: true,
                sameSite: "strict",
                maxAge: 1000 * 60 * 60 * 24
            })
            res.redirect("/")
            })

app.post("/register", (req, res) => {
    const errors = []

    if (typeof req.body.username !== "string") req.body.username = ""
    if (typeof req.body.password !== "string") req.body.password = ""

    req.body.username = req.body.username.trim()

    if(!req.body.username) errors.push("Username is required")
    if(req.body.username.length < 3 && req.body.username) errors.push("Username must be at least 3 characters long")
    if(req.body.username.length > 10 && req.body.username) errors.push("Username must be at most 10 characters long")
    if(req.body.username && !req.body.username.match(/^[a-zA-Z0-9]+$/)) errors.push("Username must only contain letters and numbers")

    const usernameStatement = db.prepare("SELECT * FROM users WHERE username = ?")
    const usernameCheck = usernameStatement.get(req.body.username)
    if (usernameCheck) {
        errors.push("Username already exists")
    }
    if (errors.length) {
  const randomPostStmt = db.prepare(`
    SELECT posts.*, users.username 
    FROM posts 
    JOIN users ON posts.authorid = users.id 
    ORDER BY RANDOM() LIMIT 1
  `);
  const randomPost = randomPostStmt.get();

  return res.render("homepage", { errors, randomPost });
}


    const salt = bcrypt.genSaltSync(10)
    req.body.password = bcrypt.hashSync(req.body.password, salt)

    const ourStatement = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)")
    const result = ourStatement.run(req.body.username, req.body.password)

    const lookupStatement = db.prepare("SELECT * FROM users WHERE id = ?")
    const ourUser = lookupStatement.get(result.lastInsertRowid)
    const ourTokenValue = jwt.sign({exp: Math.floor(Date.now()/1000) + 60*60*24,skyColor: "blue", userid: ourUser.id, username: ourUser.username} , process.env.JWTSECRET)

    res.cookie("ourSimpleApp", ourTokenValue, {

        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24
    })
    res.redirect("/")
})

app.listen(3000, '0.0.0.0', () => {
  console.log("Server running on port 3000")
});