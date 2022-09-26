const express = require('express');
const app = express();
const { pool } = require("./dbConfig");
const bcrypt = require('bcrypt');
const session = require('express-session');
const flash = require('express-flash');
const passport = require('passport');
const body_parser = require('body-parser')

const initializePassport = require('./passportConfig')
initializePassport(passport);

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    next();
});

app.use(body_parser.json())

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

app.get('/users/logout', (req, res,next)=>{
    req.logOut(function(err) {
        if (err) { return next(err); }
        res.redirect('/users/login');
    });
})

app.post('/users/register', async (req, res)=> {
        let { first_name, last_name, age, city, description, email, password, password2 } = req.body;

        let errors = [];

        if(!email || !password || !password2 || !first_name || !last_name || !age || !city){
            errors.push({ message: "Enter all fields"});
            res.statusMessage = "Uzupelnij wszystkie pola";
            res.status(400).send();
        }

        if (password !== password2) {
            errors.push({ message: "Passwords do not match" });
            res.statusMessage = "Hasla sie nie zgadzaja";
            res.status(400).send();
        }

        if (errors.length > 0) {
            res.render("register", { errors, email, password, password2, first_name, last_name, age, city });
        } else {

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
                        res.statusMessage = "Email zajety";
                        res.status(400).send();
                    }else {
                        pool.query(
                            `INSERT INTO users (email, password, first_name, last_name, age, description, city)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING id, password`,
                            [email, password, first_name, last_name, age, description, city],
                            (err ,results) => {
                                if(err){
                                    throw err;
                                }
                                console.log("results")
                                console.log(results.rows);
                                req.flash('success_msg', "You are now registered. please log in");
                                res.redirect('/users/login')
                            }
                        )
                    }
                }
            )}
    }
)
//TO zostawiamy na raziee
// app.post('/users/login', passport.authenticate('local', {
//     successRedirect: '/dashboard/',
//     failureRedirect: '/users/login',
//     failureFlash: true
// }), function(req, res) {
//         //res.send('/~' + req.user.id);
//         res.send(req.user.id);
//         console.log(req.user.id);
//     }
// );

app.post('/users/login', async (req, res)=> {
        let { email, password } = req.body;
        console.log(req.body)
        let errors = [];

        if(!email || !password) {
            errors.push({ message: "Enter all fields"});
            res.statusMessage = "Uzupelnij wszystkie pola";
            res.status(400).send();
            console.log("err")
        }

        if (errors.length > 0) {
            res.render("login", { errors, email, password });
        } else {
            pool.query(
                `SELECT * FROM USERS 
            WHERE email = $1 AND password = $2`,
                [email, password],
                (err, results)=>{
                    if(err){
                        console.log("err")
                        console.log(err)
                        throw err;

                    }
                    // console.log(results.rows)
                    if(results.rows.length === 1) {
                        console.log("test")
                        console.log(results.rows)
                        res.send(results.rows);
                    } else {
                        errors.push({message: "Wrong login or password"});
                        res.statusMessage = "Zle dane";
                        res.status(400).send();
                    }
                }
            )}
    }
);
//GET ALL USERS
app.get('/users', async (req, res)=>{
    pool.query(`Select * from users`, (err, result)=>{
        if(!err){
            res.send(result.rows);
        }
    });
});
//GET SPECIFIC USER
app.get('/users/:id', (req, res)=>{
    pool.query(`Select * from users where id=${req.params.id}`, (err, result)=>{
        if(!err){
            res.send(result.rows);
        }
        else {
            res.statusMessage = "Nie ma takiego usera";
            res.status(400).send();
        }
    });
});
//UPDATE SPECIFIC USER
app.put('/users/:id', (req, res)=>{
    let {first_name, last_name, age, description, city} = req.body;

    pool.query(`UPDATE users SET first_name = $1, last_name = $2, age = $3, description = $4, city = $5 where id=${req.params.id}`,
        [first_name, last_name, age, description, city],
        (err, result)=>{
            if(!err){
                res.send(result.rows);
            }
        });
});

//EVENTS ACTIONS ---------------------------------------------------------------------------------------------------------
//GET ALL EVENTS
app.get('/events', (req, res)=>{
    pool.query(`Select e.id, e.creator_id, e.city, e.gym_name, e.date_and_time, u.first_name, u.last_name 
                from events e 
                join users u on u.id = e.creator_id
                where is_active = true`,
        (err, result)=>{
            if(!err){
                res.send(result.rows);
            }
        });
});
//GET SPECIFIC EVENT
app.get('/events/:id', (req, res)=>{
    pool.query(`Select e.id, e.creator_id, e.city, e.gym_name, e.date_and_time, e.training_length, e.description, u.first_name, u.last_name from events e
    join users u on u.id = e.creator_id
    where e.id=${req.params.id}`, (err, result)=>{
        if(!err){
            console.log(result.rows[0])
            res.send(result.rows);
        }
    });
});
//GET ALL EVENTS WHICH USER TAKES PART
app.get('/events/user/:id', (req, res)=>{
    pool.query(`Select e.id, u.first_name, u.last_name, us.first_name as second_user_first_name, us.last_name as second_user_last_name
    from events e
    join users u on u.id = e.creator_id
    join users us on us.id = e.second_user_id
    where e.creator_id=${parseInt(req.params.id)} or e.second_user_id=${parseInt(req.params.id)}`, (err, result)=>{
        if(!err){
            console.log(result.rows)
            res.send(result.rows);
        }
    });
});
//ADD EVENT
app.post('/events/add', async (req, res)=> {
    let {creator_id,  city, gym_name, date_and_time, training_length, description} = req.body;

    let errors = [];

    if(!city || !gym_name || !date_and_time || !training_length){
        errors.push({ message: "Enter all fields"});
        res.statusMessage = "Uzupelnij wszystkie pola";
        res.status(400).send();
    }

    if (errors.length > 0) {
    } else {
        pool.query(
            `INSERT INTO events ( creator_id, city, gym_name, date_and_time, training_length, description)
                        VALUES ($1, $2, $3, $4, $5, $6)`,
            [creator_id, city, gym_name, date_and_time, training_length, description],
            (err, results) => {
                if (err) {
                    console.log(err);
                    throw err;
                }
                console.log(results.rows);
                req.flash('success_msg', "You've added an event!");
                res.redirect('/events')
            })
    }
});
//MAKE EVENT NOT ACTIVE AND ADD SECOND USER
app.put('/events/notactive/:id', (req, res)=>{
    let {second_user_id} = req.body;
    pool.query(`UPDATE EVENTS SET second_user_id = $1,is_active = false where id=${req.params.id}`,
        [second_user_id],
        (err, result)=>{
            if(!err){
                res.send(result.rows);
            }
        });
});
//MAKE EVENT ACTIVE AND ERASE SECOND USER
app.put('/events/active/:id', (req, res)=>{
    pool.query(`UPDATE EVENTS SET second_user_id = null ,is_active = true where id=${req.params.id}`,
        (err, result)=>{
            if(!err){
                res.send(result.rows);
            }
        });
});
//UPDATE EVENT
app.put('/events/:id', (req, res)=>{
    let {city, gym_name, date_and_time, training_length, description} = req.body;

    pool.query(`UPDATE events SET city = $1, gym_name = $2, date_and_time = $3, training_length = $4, description = $5
        where id=${req.params.id}`,
        [city, gym_name, date_and_time, training_length, description],
        (err, result)=>{
            if(!err){
                res.send(result.rows);
            }
        });
});
//DELETE SPECIFIC EVENT
app.delete('/events/:id', (req, res)=>{
    pool.query(`DELETE from events where id=${req.params.id}`, (err, result)=>{
        if(!err){
            res.send(result.rows);
        } else {
            console.log(err)
        }
    });
});

//STARS ---
app.get('/users/:id/stars', (req, res)=>{
    pool.query(`Select 
        AVG (stars)
        AS average_rating
        from rating 
                where second_user_id = ${req.params.id}`,
        (err, result)=>{
            if(!err){
                res.send(result.rows);
            }
        });
});
//INSERT USER RATING IF PK EXIST UPDATE STARS
app.post('/users/:id/stars', (req, res)=>{
    // let {my_id, stars} = req.body;
    let my_id = 7; // to jest id aktualnie zalogowanego uzytkownika
    let stars = 10;  // ocena którą mu wystawiliśmy
    // req.params.id bierzemy z linku i to będzie user którego profil "odwiedzamy"
    pool.query(`insert into rating (my_user_id, second_user_id, stars)
            values ($1, $2, $3)
            ON CONFLICT ON CONSTRAINT pk_stars
            DO UPDATE SET stars = $3`,
       [my_id, req.params.id, stars],

    (err, result)=>{
        if(!err){
            res.send(result.rows);
        }
    });
});

app.listen(PORT, ()=>{
    console.log(`server running port ${PORT}`);
});