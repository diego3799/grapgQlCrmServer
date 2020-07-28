const mongoose = require("mongoose");

require("dotenv").config();

const conectarDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    console.log("DB conectada");
  } catch (error) {
    console.log("Error");
    console.log(error);
    process.exit(1);
  }
};

module.exports = conectarDB;
