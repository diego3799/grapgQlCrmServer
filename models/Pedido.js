const mongoose = require("mongoose");

const PedidoSchema = mongoose.Schema({
  pedido: {
    type: Array,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
  cliente: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Cliente",
  },
  vendedor: {
    type: mongoose.Types.ObjectId,
    required: true,
    ref: "Usuario",
  },
  estado: {
    type: String,
    default: "PENDIENTE",
  },
  creado: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Pedido", PedidoSchema);
