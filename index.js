const { ApolloServer, gql } = require("apollo-server");
const typeDefs = require("./db/schema");
const resolvers = require("./db/resolvers");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const conectarDB = require("./config/db");
conectarDB();

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    // console.log(req);
    const token = req.headers.authorization || "";
    if (token) {
      try {
        const usuario=jwt.verify(token.replace("Bearer ",""),process.env.SECRETA)
        return {
          usuario
        }
      } catch (error) {
        console.log(error);
        // throw new Error("No valido")
      }
    }

  },
});

server.listen().then(({ url }) => console.log(`Servidor Listo en ${url}`));
