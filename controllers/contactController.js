const validator = require("validator")
const { ObjectId } = require("mongodb")
const sanitizeHtml = require("sanitize-html")
const nodemailer = require("nodemailer")
const petsCollection = require("../db").db().collection("pets")
const contactsCollection = require("../db").db().collection("contacts")



const sanitizeOptions = {
    allowedTags: [],
    allowedAttributes: {}
}

exports.submitContact = async function (req, res, next) {
    if (req.body.secret.toUpperCase() !== "PUPPY") {
        console.log("spam detected")
        return res.json({ massage: "Sorry" })

    }
    if (!validator.isEmail(req.body.email)) {
        console.log("invalid email detected")
        return res.json({ massage: "Sorry" })
    }

    if (!ObjectId.isValid(req.body.id)) {
        console.log("invalid id detected")
        return res.json({ massage: "Sorry" })

    }
    req.body.id = new ObjectId(req.body.id)
    const doesPetExist = await petsCollection.findOne({ _id: req.body.id })
    if (!doesPetExist) {
        console.log("pet doesnot exist")
        return res.json({ massage: "Sorry" })
    }

    if (typeof req.body.name != "string") {
        req.body.name = ""

    }
    if (typeof req.body.email != "string") {
        req.body.email = ""

    }
    if (typeof req.body.comment != "string") {
        req.body.comment = ""

    }

    const object = {
        petId: req.body.id,
        name: sanitizeHtml(req.body.name, sanitizeOptions),
        email: sanitizeHtml(req.body.email, sanitizeOptions),
        comment: sanitizeHtml(req.body.comment, sanitizeOptions)

    }
    console.log(object)
    // Looking to send emails in production? Check out our Email API/SMTP product!
    var transport = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,

        auth: {
            user: process.env.MAILTRAPUSERNAME,
            pass: process.env.MAILTRAPPASSWORD

        }
    })
    try {
        const promise1 = transport.sendMail({
            to: object.email,
            from: "petadoption@localhost",
            subject: `Thank you for your interest in ${doesPetExist.name}`,
            html: `<h3 style="color:purple;font-size:30px ;font-weight:normal">Thank you</h3>
        <p>we appreciate your interest in ${doesPetExist.name} and one of our staff members will reach out to you soon!Below is a copy of the massage you send to us for your personal records:</p>
        <p><em>${doesPetExist.comment}</em></p>`
        })

        const promise2 = transport.sendMail({
            to: "petadoption@localhost",
            from: "petadoption@localhost",
            subject: `Thank you for your interest in ${doesPetExist.name}`,
            html: `<h3 style="color:purple;font-size:30px ;font-weight:normal">New Contact</h3>
        <p>Name:${object.name}<br>
        Pet Interest In:${doesPetExist.name}<br>
        Emil:${object.email}<br>
        Massage:${object.comment}
        </p>`

        })
        const promise3 = await contactsCollection.insertOne(object)
        await Promise.all([promise1, promise2, promise3])
    }
    catch (err) {
        next(err)
    }

    res.send("Thanks for sending data")
}
exports.viewPetContacts = async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
        console.log("bad id")
        return res.redirect("/")
    }
    const pet = await petsCollection.findOne({ _id: new ObjectId(req.params.id) })
    if (!pet) {
        console.log("pet does not exist")
        return res.redirect("/")
    }
    const contacts = await contactsCollection.find({ petId: new ObjectId(req.params.id) }).toArray()
    res.render("pet-contacts", { contacts, pet })
}