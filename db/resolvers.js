/**Models */
const Usuario = require("../models/Usuario");
const Producto = require("../models/Producto");
const Cliente = require("../models/Cliente");
const Pedido = require("../models/Pedido");

const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config();

const crearToken = (usuario, expiresIn) => {
  const { id, email, nombre, apellido } = usuario;
  return jwt.sign({ id, email, nombre, apellido }, process.env.SECRETA, {
    expiresIn,
  });
};

const resolvers = {
  Query: {
    obtenerUsuario: async (_, {}, ctx) => {
      return ctx.usuario;
    },
    obtenerProductos: async () => {
      try {
        const productos = await Producto.find({});
        return productos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerProducto: async (_, { id }) => {
      const producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("Producto no encontrado");
      }
      return producto;
    },
    obtenerClientes: async () => {
      try {
        const clientes = await Cliente.find({});
        return clientes;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerClientesVendedor: async (_, {}, ctx) => {
      const vendedor = ctx.usuario.id;
      try {
        const clientes = await Cliente.find({ vendedor });
        return clientes;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerCliente: async (_, { id }, ctx) => {
      /**revisar si el cliente existe */
      const cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }
      /**Checar si el que lo creo es el mismo
       * vendedor type Object por el eso ,toString()
       */
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("404: no Authorized");
      }
      return cliente;
    },
    obtenerPedidos: async () => {
      try {
        const pedidos = await Pedido.find({});
        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedidosVendedor: async (_, {}, ctx) => {
      const vendedor = ctx.usuario.id;
      try {
        /** Pare evitarnos pedir el cliente en una ruta separada, el metodo populate nos regresa el cliente */
        const pedidos = await Pedido.find({ vendedor }).populate("cliente");

        return pedidos;
      } catch (error) {
        console.log(error);
      }
    },
    obtenerPedido: async (_, { id }, ctx) => {
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("pedido no encontrado");
      }
      /**Checar si el que lo creo es el mismo
       * vendedor type Object por el eso ,toString()
       */
      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("404: no Authorized");
      }
      return pedido;
    },
    obtenerPedidosEstado: async (_, { estado }, ctx) => {
      const pedidos = await Pedido.find({ estado, vendedor: ctx.usuario.id });
      return pedidos;
    },
    mejoresClientes: async () => {
      const clientes = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$cliente",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "clientes",
            localField: "_id",
            foreignField: "_id",
            as: "cliente",
          },
        },
        {
          $sort: { total: -1 },
        },
      ]);
      return clientes;
    },
    mejoresVendedores: async () => {
      const vendedores = await Pedido.aggregate([
        { $match: { estado: "COMPLETADO" } },
        {
          $group: {
            _id: "$vendedor",
            total: { $sum: "$total" },
          },
        },
        {
          $lookup: {
            from: "usuarios",
            localField: "_id",
            foreignField: "_id",
            as: "vendedor",
          },
        },
        {
          $limit: 3,
        },
        {
          $sort: { total: -1 },
        },
      ]);
      return vendedores;
    },
    buscarProducto: async (_, { texto }) => {
      const productos = await Producto.find({ $text: { $search: texto } });
      return productos;
    },
  },
  Mutation: {
    nuevoUsuario: async (_, { input }) => {
      //Revisar si existe
      const { email, password } = input;
      const existeUsuario = await Usuario.findOne({ email });
      if (existeUsuario) {
        throw new Error("El Usuario ya esta registrado");
      }

      //Hashear
      const salt = await bcryptjs.genSalt(10);
      input.password = await bcryptjs.hash(input.password, salt);
      //Guardar
      try {
        const usuario = new Usuario(input);
        usuario.save();
        return usuario;
      } catch (error) {
        console.log(error);
      }
    },
    autenticarUsuario: async (_, { input }) => {
      //Revisar si existe
      const { email, password } = input;
      const existeUsuario = await Usuario.findOne({ email });
      if (!existeUsuario) {
        throw new Error("El Usuario no existe");
      }

      //Hashear el password y compararlo

      const passwordCorrecto = await bcryptjs.compare(
        password,
        existeUsuario.password
      );

      if (!passwordCorrecto) {
        throw new Error("Password incorrecto");
      }

      return {
        token: crearToken(existeUsuario, "24h"),
      };
    },
    nuevoProducto: async (_, { input }) => {
      try {
        const producto = new Producto(input);
        await producto.save();
        return producto;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarProducto: async (_, { input, id }) => {
      let producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("Producto no encontrado");
      }
      producto = await Producto.findByIdAndUpdate(id, input, { new: true });

      return producto;
    },
    eliminarProducto: async (_, { id }) => {
      let producto = await Producto.findById(id);
      if (!producto) {
        throw new Error("Producto no encontrado");
      }
      //Eliminar
      await Producto.findByIdAndDelete(id);
      return "Producto Eliminado";
    },
    nuevoCliente: async (_, { input }, ctx) => {
      const existe = await Cliente.findOne({ email: input.email });
      if (existe) {
        throw new Error("El Cliente Ya está registrado");
      }
      input.vendedor = ctx.usuario.id;
      try {
        const cliente = new Cliente(input);
        await cliente.save();
        return cliente;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarCliente: async (_, { id, input }, ctx) => {
      /**revisar si el cliente existe */
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }
      /**Checar si el que lo creo es el mismo
       * vendedor type Object por el eso ,toString()
       */
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("404: no Authorized");
      }
      try {
        cliente = await Cliente.findByIdAndUpdate(id, input, { new: true });
        return cliente;
      } catch (error) {
        console.log(error);
      }

      return cliente;
    },
    eliminarCliente: async (_, { id }, ctx) => {
      let cliente = await Cliente.findById(id);
      if (!cliente) {
        throw new Error("Cliente no encontrado");
      }
      /**Checar si el que lo creo es el mismo
       * vendedor type Object por el eso ,toString()
       */
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("404: no Authorized");
      }
      try {
        cliente = await Cliente.findByIdAndDelete(id);
        return "Eliminado Correctamente";
      } catch (error) {
        console.log(error);
      }

      return cliente;
    },
    nuevoPedido: async (_, { input }, ctx) => {
      const { cliente } = input;

      let existe = await Cliente.findById(cliente);
      if (!existe) {
        throw new Error("Cliente no encontrado");
      }

      if (existe.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("404: no Authorized");
      }
      for await (let item of input.pedido) {
        const { id } = item;

        const producto = await Producto.findById(id);
        if (item.cantidad > producto.existencia) {
          throw new Error(
            `El articulo: ${producto.nombre} excede la cantidad disponible`
          );
        } else {
          /**Restar la cantidad */
          producto.existencia -= item.cantidad;
          await producto.save();
        }
      }
      const nuevoPedido = new Pedido(input);
      nuevoPedido.vendedor = ctx.usuario.id;
      try {
        await nuevoPedido.save();
        const returnDePedido = await Pedido.findById(nuevoPedido.id).populate(
          "cliente"
        );
        return returnDePedido;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarPedido: async (_, { input, id }, ctx) => {
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("Pedido no encontrado");
      }

      const cliente = await Cliente.findById(input.cliente);
      if (!cliente) {
        throw new Error("Cliente no existe");
      }
      /**Checar si el que lo creo es el mismo
       * vendedor type Object por el eso ,toString()
       */
      if (cliente.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("404: no Authorized");
      }
      if (input.pedido)
        for await (let item of input.pedido) {
          const producto = await Producto.findById(item.id);
          if (item.cantidad > producto.existencia) {
            throw new Error(
              `El articulo: ${producto.nombre} excede la cantidad`
            );
          } else {
            /**Restar la cantidad */
            producto.existencia -= item.cantidad;
            await producto.save();
          }
        }
      const resultado = await Pedido.findByIdAndUpdate(id, input, {
        new: true,
      });

      return resultado;
    },
    eliminarPedido: async (_, { id }, ctx) => {
      const pedido = await Pedido.findById(id);
      if (!pedido) {
        throw new Error("Pedido no encontrado");
      }
      if (pedido.vendedor.toString() !== ctx.usuario.id) {
        throw new Error("404: no Authorized");
      }
      try {
        await Pedido.findByIdAndDelete(id);
        return "Eliminado";
      } catch (error) {
        console.log(error);
      }
    },
  },
};

module.exports = resolvers;
