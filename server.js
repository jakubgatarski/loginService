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
    res.render('dashboard', {user: "ASDASD"});
});

app.get('/users/logout', (req, res,next)=>{
    req.logOut(function(err) {
        if (err) { return next(err); }
        res.redirect('/users/login');
    });
})


app.post('/users/register', async (req, res)=> {
    let { email, password, password2, first_name, last_name, age  } = req.body;
    console.log({email, password, password2, first_name, last_name, age});

    let errors = [];

    if(!email || !password || !password2 || !first_name || !last_name || !age ){
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
        res.render("register", { errors, email, password, password2, first_name, last_name, age });
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
                        `INSERT INTO users (email, password, first_name, last_name, age)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING id, password`,
                        [email, hashedPassword, first_name, last_name, age],
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
app.get('/users/:id', (req, res)=>{
    pool.query(`Select * from users where id=${req.params.id}`, (err, result)=>{
        if(!err){
            res.send(result.rows);
        }
    });
})

app.get('/events', (req, res)=>{
    pool.query(`Select creator_id, city, date_and_time from events where is_active = true`, (err, result)=>{
        if(!err){
            res.send(result.rows);
        }
    });
})

app.get('/events/:id', (req, res)=>{
    pool.query(`Select * from events where id=${req.params.id}`, (err, result)=>{
        if(!err){
            res.send(result.rows );
        }
    });
})

app.put('/events/:id', (req, res)=>{
    pool.query(`UPDATE EVENTS SET is_active = false where id=${req.params.id}`, (err, result)=>{
        if(!err){
            res.send(result.rows);
        }
    });
})

// app.post('/events/add', (req, res)=> {
//     let {id, creator_id, city, gym_name, date_and_time, training_length, training_plans} = req.body;
//     pool.query(
//         `INSERT INTO events ( creator_id, city, gym_name, date_and_time, training_length, training_plans)
//                         VALUES ($1, $2, $3, $4, $5, $6)`,
//             [creator_id, city, gym_name, date_and_time, training_length, training_plans],
//             (err, results) => {
//                 if (err) {
//                     console.log(err);
//                     throw err;
//                 }
//                 console.log(results.rows);
//             })
//     })

app.listen(PORT, ()=>{
    console.log(`server running port ${PORT}`);
});