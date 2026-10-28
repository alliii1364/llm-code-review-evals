// Express 4 route that returns an order.
app.get("/orders/:id", async (req, res) => {
  const order = await orders.findById(req.params.id);
  res.json(order);
});
