const express = require("express")
const path = require("path")
const bodyParser = require("body-parser")
const GoogleSpreadsheet = require("google-spreadsheet")
const credentials = require("./bugtracker.json")
const { promisify } = require("util")
const sgMail = require('@sendgrid/mail')

// Configurações
const docId = "1fMeDTtKyPbMv2jz09qNqYTv283LC-rCvNLSlocv3k2Y"
const worsheetIndex = 0
const sendGridKey = "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"

const app = express()

app.set("view engine", "ejs")
app.set("views", path.resolve(__dirname, "views"))

app.use(bodyParser.urlencoded({ extended: true }))

app.get("/", (request, response) => {
  response.render("home")
})

app.post("/", async (request, response) => {
  const { name, email, issueType, howToReproduce, expectedOutput, receivedOutput, userAgent, userDate } = request.body
  
  try {
    const doc = new GoogleSpreadsheet(docId)

    await promisify(doc.useServiceAccountAuth)(credentials)

    const info = await promisify(doc.getInfo)()
    const worksheet = info.worksheets[worsheetIndex]
    
    await promisify(worksheet.addRow)({ 
      name, 
      email, 
      issueType, 
      howToReproduce, 
      expectedOutput, 
      receivedOutput,
      userAgent,
      userDate,
      source: request.query.source || "direct"
    })

    if (issueType === "CRITICAL") {
      sgMail.setApiKey(sendGridKey)

      const msg = {
        to: 'matheusa56@gmail.com',
        from: 'matheusa56@gmail.com',
        subject: 'BUG CRÌTICO REPORTADO',
        text: `
          O usuário ${name} reportou um problema:

          ° Saída experada: ${expectedOutput};

          ° Saída recebida: ${receivedOutput};

          ° Como reproduzir: ${howToReproduce};

          ° Informações do navegador: ${userAgent};

          ° Data: ${userDate};
        `,
        html: `
          <strong>O usuário ${name} reportou um problema:</strong>
          <ul>
            <li>Saída experada: ${expectedOutput}</li>
            <li>Saída recebida: ${receivedOutput}</li>
            <li>Como reproduzir: ${howToReproduce}</li>
            <li>Informações do navegador: ${userAgent}</li>
            <li> Data: ${userDate}</li>
          </ul>
        `,
      }
  
      await sgMail.send(msg)
    }

    response.render("sucesso")
  } catch (err) {
    response.send("Erro ao enviar formulário.")
    console.log(err)
  }
})

app.listen(3000, (err) => {
  if (err) {
    console.log("Aconteceu um erro", err)
  } else {
    console.log("BugTracker rodando na porta http://localhost:3000")
  }
})