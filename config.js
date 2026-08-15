const CONFIG = {
  whatsappNumber: "5581981377933",
  restaurantName: "Don Massas",
  orderCounterEndpoint: "https://script.google.com/macros/s/AKfycbxsmKCavhXvnAkWPxY1upPqHL92tK7GgvtBcaJTZYcHbIkAdBtXwY3V0AQuPhxSQaLD/exec",
  painelPin: "1234",
  businessHours: {
    // closedWeekday: 1,
    // ranges: [
    //   { start: "11:00", end: "15:00" },
    //   { start: "18:00", end: "22:00" }
    // ]
    closedWeekday: 7, // 7 não existe como dia da semana, então nunca fecha
    ranges: [
      { start: "00:00", end: "23:59" }
    ]
  }
};