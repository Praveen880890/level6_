const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
let server, agent;
function gettoken(res) {
  var $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}
const login = async (agent,username,password)=>{
  let res = await agent.get("/login");
  let csrfToken=gettoken(res);
  res = await agent.post("/session").send({
    email:username,
    password:password,
    _csrf: csrfToken,
  })
}
describe("Todo Application test", function () {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });
  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });
  test("Sign up",async ()=>{
    let res = await agent.get("/signup");
    const csrfToken=gettoken(res);
    res = await agent.post("/users").send({
      firstName:"test",
      lastName: "uaser",
      email:"ganesh@gmail.com",
      password:"12345678",
      _csrf: csrfToken,
    })
    expect(res.statusCode).toBe(302);
  })
  test("Sign out",async ()=>{
    let res = await agent.get("/todos");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/signout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/todos");
    expect(res.statusCode).toBe(302);
  })
  test("Creates a todo", async () => {
    const agent= request.agent(server);
    await login(agent,"ganesh@gmail.com","12345678")
    const res = await agent.get("/todos");
    const Ctoken = gettoken(res);
    const response = await agent.post("/todos").send({
      title: "fav movies",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: Ctoken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("updates a todo", async () => {
    const agent= request.agent(server);
    await login(agent,"ganesh@gmail.com","12345678")
    let res = await agent.get("/todos");
    let Ctoken = gettoken(res);
    await agent.post("/todos").send({
      title: "Buy bread and butter",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: Ctoken,
    });
    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.duetodaytodos.length;
    const latestTodo = parsedGroupedResponse.duetodaytodos[dueTodayCount - 1];
    res = await agent.get("/todos");
    Ctoken = gettoken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: Ctoken,
        completed: true,
      });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });
  test("updates a todo 2", async () => {
    const agent= request.agent(server);
    await login(agent,"ganesh@gmail.com","12345678")
    let res = await agent.get("/todos");
    let Ctoken = gettoken(res);
    await agent.post("/todos").send({
      title: "watch batman",
      dueDate: new Date().toISOString(),
      completed: true,
      _csrf: Ctoken,
    });

    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.duetodaytodos.length;
    const latestTodo = parsedGroupedResponse.duetodaytodos[dueTodayCount - 1];

    res = await agent.get("/todos");
    Ctoken = gettoken(res);

    const markCompleteResponse = await agent
      .put(`/todos/${latestTodo.id}`)
      .send({
        _csrf: Ctoken,
        completed: false,
      });
    const parsedUpdateResponse = JSON.parse(markCompleteResponse.text);
    expect(parsedUpdateResponse.completed).toBe(false);
  });
  test("Deletes a todo", async () => {
    const agent= request.agent(server);
    await login(agent,"ganesh@gmail.com","12345678")
    let res = await agent.get("/todos");
    let Ctoken = gettoken(res);
    await agent.post("/todos").send({
      title: "meet tom cruise",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: Ctoken,
    });
    const groupedTodosResponse = await agent
      .get("/todos")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(groupedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.duetodaytodos.length;
    const latestTodo = parsedGroupedResponse.duetodaytodos[dueTodayCount - 1];
    res = await agent.get("/todos");
    Ctoken = gettoken(res);
    const todoid = latestTodo.id;
    const deleteResponseTrue = await agent.delete(`/todos/${todoid}`).send({
      _csrf: Ctoken,
    });
    const parsedDeleteResponseTrue = JSON.parse(
      deleteResponseTrue.text
    ).success;
    expect(parsedDeleteResponseTrue).toBe(true);
    res = await agent.get("/todos");
    Ctoken = gettoken(res);
    const deleteResponseFail = await agent.delete(`/todos/${todoid}`).send({
      _csrf: Ctoken,
    });
    const parsedDeleteResponseFail = JSON.parse(
      deleteResponseFail.text
    ).success;
    expect(parsedDeleteResponseFail).toBe(false);
  });
});