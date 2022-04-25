const express = require('express');
const app = express();
const redis = require('redis');
const client = redis.createClient();

app.use(express.json());

app.get('/', (req, res) => res.send("Backend"));


app.post('/user', async (req,res) => {
    const {email} = req.body;

    if (!client.isOpen) await client.connect();

    if(!(await client.exists(email))) {
        res.status(404).send('Email not found!');
        return;
    }

    let name = await client.HGET(email, 'name');
    let ref_code = await client.HGET(email, 'ref_code');
    let points = await client.HGET(email, 'my_points');
    let refferals = await client.HGET(email, 'refs');

    res.send({
        'name' : name,
        'ref_code' : ref_code,
        'points' : points,
        'refs' : refferals
    });

});

app.post('/login', async (req,res) => {

    const {email , password} = req.body;
    if (!client.isOpen) await client.connect();

    if(!(await client.exists(email))) {
        res.status(404).send('Email not found!');
        return;
    }
    let passwordStored = await client.HGET(email, 'password');

    if(passwordStored !== password){
        res.status(404).send("Wrong password!");
        return;
    }

    if(passwordStored === password){
        res.send("Login successful");
    }
});



app.post('/register', async (req, res) => {

    const { email, password, my_ref_code, ref_code, name } = req.body;
    console.log(req.body);

    if (!client.isOpen) await client.connect();

    if (await client.exists(email)) {
        res.status(404).send("Email already exists!");
        return;
    }
    ///REFFERAL CODE SENT
    if(ref_code !== ""){
        if(await client.exists(ref_code)){

            let ref_array = [];
            let reffered_by_email = await client.get(ref_code);
            let reffered_all =  await client.HGET(reffered_by_email, "refs");
            ref_array = reffered_all.split(',');
            ref_array.push(name);

            console.log("REFFERED BY : " + reffered_by_email);

            var points = await client.HGET(reffered_by_email, "my_points");
            console.log("MY POINTS : " + points);
            points = parseInt(points);
            points = points + 50;
            await client.HSET(reffered_by_email, "my_points", points);
            await client.HSET(reffered_by_email, "refs", ref_array);
        }else{
            res.status(404).send("INVALID referral code!");
            return;
        }
    }
   

    client.HSET(email, 'password', password);
    client.HSET(email, 'my_points', 0);
    client.HSET(email, 'name', name);
    client.HSET(email, 'refs', []);
    client.HSET(email, 'ref_code', my_ref_code);
    client.SET(my_ref_code, email);
    res.status(200).send("Got it");

});







app.listen(3000, () => console.log("Server listening at port 3000"));