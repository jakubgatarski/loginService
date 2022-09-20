const express = require('express');
const app = express();
const { pool } = require("./dbConfig");
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');


const initializePassport = require('./passportConfig')
initializePassport(passport);

const PORT = process.env.PORT || 4000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({extended: false}));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

app.get('/', (req, res)=> {
    res.render('index');
});

app.get('/users/register', (req, res)=> {
    res.render('register');
});

app.get('/users/login', (req, res)=> {
    res.render('login');
});

app.get('/dashboard', (req, res)=> {
    res.render('dashboard/', {user: req.user.name});
});

app.get('/users/logout', (req, res,next)=>{
    req.logOut(function(err) {
        if (err) { return next(err); }
        res.redirect('/users/login');
    });
})


app.post('/users/register', async (req, res)=> {
    let { name, email, password, password2 } = req.body;
    console.log({name, email, password, password2});

    let errors = [];

    if(!name || !email || !password || !password2){
        errors.push({ message: "Enter all fields"});
    }
    //more validators
    // if (password.length < 6) {
    //     errors.push({ message: "Password must be a least 6 characters long" });
    // }

    if (password !== password2) {
        errors.push({ message: "Passwords do not match" });
    }

    if (errors.length > 0) {
        res.render("register", { errors, name, email, password, password2 });
    } else {
        let hashedPassword = await  bcrypt.hash(password, 10);
        console.log(hashedPassword);

        pool.query(
            `SELECT * FROM USERS 
            WHERE email = $1`,
            [email],
            (err, results)=>{
                if(err){
                    throw err;
                }
                console.log(results.rows)
                if(results.rows.length > 0){
                    errors.push({message: "email alreaduy in use"});
                    res.render('register', {errors });
                }else {
                    pool.query(
                        `INSERT INTO users (name, email, password)
                        VALUES ($1, $2, $3)
                        RETURNING id, password`,
                        [name, email, hashedPassword],
                        (err ,results) => {
                            if(err){
                                throw err;
                            }
                            console.log(results.rows);
                            req.flash('success_msg', "You are now registered. please log in");
                            res.redirect('/users/login')
                        }
                    )
                }
            }
        )
    }
});

app.post('/users/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true
}));


// app.get('/users', (req, res)=>{
//     pool.query(`Select * from users`, (err, result)=>{
//         if(!err){
//             res.send(result.rows);
//         }
//     });
// })
//
// app.get('/users/:id', (req, res)=>{
//     pool.query(`Select * from users where id=${req.params.id}`, (err, result)=>{
//         if(!err){
//             res.send(result.rows);
//         }
//     });
// })

// app.get('/events', (req, res)=>{
//     pool.query(`Select * from events`, (err, result)=>{
//         if(!err){
//             res.send(result.rows);
//         }
//     });
// })
//
// app.get('/events/:id', (req, res)=>{
//     pool.query(`Select * from events where id=${req.params.id}`, (err, result)=>{
//         if(!err){
//             res.send(result.rows );
//         }
//     });
// })

app.listen(PORT, ()=>{
    console.log(`server running port ${PORT}`);
});