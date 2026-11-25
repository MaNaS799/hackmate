const request = require("supertest");
const { app, server } = require("../server");
const localDb = require("../lib/localDb");
const seedDatabase = require("../seed");

describe("HackMate Core Acceptance Criteria Automated Tests", () => {
  let aliceToken;
  let bobToken;
  let charlieToken;
  let adminToken;
  const eventId = "event_sih";

  beforeAll(async () => {
    // Seed fresh data before running tests
    await seedDatabase();

    // 1. Login Alice
    const resAlice = await request(app)
      .post("/api/auth/login")
      .send({ email: "alice@thapar.edu", password: "password123" });
    expect(resAlice.status).toBe(200);
    aliceToken = resAlice.body.token;

    // 2. Login Bob
    const resBob = await request(app)
      .post("/api/auth/login")
      .send({ email: "bob@thapar.edu", password: "password123" });
    expect(resBob.status).toBe(200);
    bobToken = resBob.body.token;

    // 3. Login Charlie
    const resCharlie = await request(app)
      .post("/api/auth/login")
      .send({ email: "charlie@thapar.edu", password: "password123" });
    expect(resCharlie.status).toBe(200);
    charlieToken = resCharlie.body.token;

    // 4. Login Admin
    const resAdmin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@thapar.edu", password: "password123" });
    expect(resAdmin.status).toBe(200);
    adminToken = resAdmin.body.token;
  });

  afterAll((done) => {
    if (server && server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  // TEST 1: Only Thapar University email (@thapar.edu) can register or log in
  describe("1. College-Only Verification (@thapar.edu)", () => {
    it("should REJECT signup with a non-college email (e.g. gmail.com)", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Intruder User",
          email: "intruder@gmail.com",
          password: "password123",
          branch: "CSE",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/college email domain/i);
    });

    it("should REJECT signup with another external domain (e.g. yahoo.com)", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Spammer",
          email: "spam@yahoo.com",
          password: "password123",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/college email domain/i);
    });

    it("should REJECT signup with another university email (e.g. campus.edu) when domain is strictly thapar.edu", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Outsider",
          email: "outsider@campus.edu",
          password: "password123",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/college email domain/i);
    });

    it("should REJECT login with a non-college email (e.g. gmail.com)", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "intruder@gmail.com",
          password: "password123",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/restricted to verified college emails/i);
    });

    it("should ALLOW signup with an authorized @thapar.edu college domain", async () => {
      const testEmail = `student_${Date.now()}@thapar.edu`;
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Thapar Student",
          email: testEmail,
          password: "password123",
          branch: "Computer Science (CSE)",
          year: "3rd Year",
          role: "Frontend",
          skills: ["React", "TypeScript", "Tailwind"],
        });

      expect(response.status).toBe(201);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(testEmail);
    });
  });

  // TEST 2: Deck endpoint & No repeat profiles
  describe("2. Deck Endpoint & No Repeat Profiles", () => {
    it("should return candidates enrolled in the event, and EXCLUDE already swiped profiles", async () => {
      // Fetch initial deck for Alice
      const initialDeck = await request(app)
        .get(`/api/events/${eventId}/deck`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(initialDeck.status).toBe(200);
      expect(initialDeck.body.candidates).toBeInstanceOf(Array);
      expect(initialDeck.body.candidates.length).toBeGreaterThan(0);

      const targetToSwipe = initialDeck.body.candidates[0];
      const targetId = targetToSwipe._id;

      // Alice swipes (passes) on targetToSwipe
      const swipeRes = await request(app)
        .post(`/api/events/${eventId}/swipe`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ targetId, direction: "left" });

      expect(swipeRes.status).toBe(200);

      // Re-fetch deck for Alice for the same event
      const updatedDeck = await request(app)
        .get(`/api/events/${eventId}/deck`)
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(updatedDeck.status).toBe(200);
      const existsInUpdated = updatedDeck.body.candidates.some((c) => String(c._id) === String(targetId));
      expect(existsInUpdated).toBe(false); // MUST NOT REAPPEAR!
    });
  });

  // TEST 3: Swipe Idempotency
  describe("3. Swipe Idempotency", () => {
    it("should handle double/duplicate swipes on the same target and event without crashing or duplicating", async () => {
      const targetId = "user_004_divya";

      // First swipe
      const swipe1 = await request(app)
        .post(`/api/events/${eventId}/swipe`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ targetId, direction: "right" });

      expect(swipe1.status).toBe(200);

      // Second identical swipe (duplicate/double swipe simulation)
      const swipe2 = await request(app)
        .post(`/api/events/${eventId}/swipe`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ targetId, direction: "right" });

      expect(swipe2.status).toBe(200);
      expect(swipe2.body.message).toBeDefined();
    });
  });

  // TEST 4: Mutual-swipe creates exactly one match
  describe("4. Mutual Match Creation", () => {
    it("should create a mutual match ONLY when both users swipe right on each other for the same event", async () => {
      const u1Token = aliceToken;
      const u2Token = bobToken;
      const u1Id = "user_001_alice";
      const u2Id = "user_002_bob";

      // 1. Alice swipes right on Bob
      const res1 = await request(app)
        .post(`/api/events/${eventId}/swipe`)
        .set("Authorization", `Bearer ${u1Token}`)
        .send({ targetId: u2Id, direction: "right" });

      expect(res1.status).toBe(200);
      expect(res1.body.isMatch).toBe(false); // PENDING, Bob hasn't swiped right yet

      // 2. Bob swipes right on Alice -> TRIGGER MUTUAL MATCH!
      const res2 = await request(app)
        .post(`/api/events/${eventId}/swipe`)
        .set("Authorization", `Bearer ${u2Token}`)
        .send({ targetId: u1Id, direction: "right" });

      expect(res2.status).toBe(200);
      expect(res2.body.isMatch).toBe(true);
      expect(res2.body.match).toBeDefined();
      const matchId = res2.body.match._id;

      // 3. Repeat right swipe: must not create duplicate matches
      const res3 = await request(app)
        .post(`/api/events/${eventId}/swipe`)
        .set("Authorization", `Bearer ${u2Token}`)
        .send({ targetId: u1Id, direction: "right" });

      expect(res3.status).toBe(200);

      // Verify in Alice's match list: exactly 1 match with Bob
      const matchesAlice = await request(app)
        .get("/api/matches")
        .set("Authorization", `Bearer ${u1Token}`);

      expect(matchesAlice.status).toBe(200);
      const matchesWithBob = matchesAlice.body.filter(
        (m) => m.otherUser && String(m.otherUser._id) === u2Id && String(m.event) === eventId
      );
      expect(matchesWithBob.length).toBe(1);
    });
  });

  // TEST 5: Chat blocked between non-matched users
  describe("5. Chat Protection & Authorization", () => {
    it("should BLOCK unauthorized third-party users from accessing or sending messages to a match", async () => {
      // Find the confirmed match between Alice and Bob
      const matchesRes = await request(app)
        .get("/api/matches")
        .set("Authorization", `Bearer ${aliceToken}`);

      expect(matchesRes.status).toBe(200);
      expect(matchesRes.body.length).toBeGreaterThan(0);
      const activeMatch = matchesRes.body[0];
      const matchId = activeMatch._id;

      // Alice (matched) can send message
      const aliceMsg = await request(app)
        .post(`/api/matches/${matchId}/messages`)
        .set("Authorization", `Bearer ${aliceToken}`)
        .send({ text: "Hello from Alice!" });

      expect(aliceMsg.status).toBe(201);

      // Bob (matched) can read messages
      const bobRead = await request(app)
        .get(`/api/matches/${matchId}/messages`)
        .set("Authorization", `Bearer ${bobToken}`);

      expect(bobRead.status).toBe(200);
      expect(bobRead.body.some((m) => m.text === "Hello from Alice!")).toBe(true);

      // Charlie (NOT in this match) attempts to read messages -> MUST BE 403 FORBIDDEN
      const charlieRead = await request(app)
        .get(`/api/matches/${matchId}/messages`)
        .set("Authorization", `Bearer ${charlieToken}`);

      expect(charlieRead.status).toBe(403);
      expect(charlieRead.body.message).toMatch(/access denied/i);

      // Charlie attempts to send a message to Alice and Bob's match -> MUST BE 403 FORBIDDEN
      const charlieSend = await request(app)
        .post(`/api/matches/${matchId}/messages`)
        .set("Authorization", `Bearer ${charlieToken}`)
        .send({ text: "Intruder attempting to join private chat!" });

      expect(charlieSend.status).toBe(403);
      expect(charlieSend.body.message).toMatch(/access denied/i);
    });
  });

  // TEST 6: Intelligent Skill-Fit Algorithm & Deck Ranking
  describe("6. Intelligent Deck Ranking (Skill-Fit Algorithm)", () => {
    it("should return candidates sorted by fitScore descending and include complementary breakdown", async () => {
      const deckRes = await request(app)
        .get(`/api/events/${eventId}/deck?limit=10`)
        .set("Authorization", `Bearer ${charlieToken}`);

      expect(deckRes.status).toBe(200);
      expect(deckRes.body.candidates).toBeDefined();
      expect(Array.isArray(deckRes.body.candidates)).toBe(true);

      const candidates = deckRes.body.candidates;
      if (candidates.length > 0) {
        // Every candidate should have fitScore, fitBadge, and fitReasons
        const first = candidates[0];
        expect(typeof first.fitScore).toBe("number");
        expect(first.fitScore).toBeGreaterThanOrEqual(68);
        expect(first.fitScore).toBeLessThanOrEqual(99);
        expect(first.fitBadge).toBeDefined();
        expect(Array.isArray(first.fitReasons)).toBe(true);

        // Verify descending sort order
        for (let i = 0; i < candidates.length - 1; i++) {
          expect(candidates[i].fitScore).toBeGreaterThanOrEqual(candidates[i + 1].fitScore);
        }
      }
    });
  });

  // TEST 7: Swipe Rewind / Undo Functionality
  describe("7. Swipe Rewind / Undo Feature", () => {
    it("should allow a user to rewind their last swipe and restore the candidate to the deck", async () => {
      // 1. Fetch initial deck for Charlie
      const initialDeck = await request(app)
        .get(`/api/events/${eventId}/deck?limit=5`)
        .set("Authorization", `Bearer ${charlieToken}`);

      expect(initialDeck.status).toBe(200);
      expect(initialDeck.body.candidates.length).toBeGreaterThan(0);
      const candidateToSwipe = initialDeck.body.candidates[0];
      const targetId = candidateToSwipe._id;

      // 2. Swipe left (Pass) on candidateToSwipe
      const swipeRes = await request(app)
        .post(`/api/events/${eventId}/swipe`)
        .set("Authorization", `Bearer ${charlieToken}`)
        .send({ targetId, direction: "left" });

      expect(swipeRes.status).toBe(200);

      // 3. Candidate should no longer be in deck
      const deckAfterSwipe = await request(app)
        .get(`/api/events/${eventId}/deck?limit=10`)
        .set("Authorization", `Bearer ${charlieToken}`);

      expect(
        deckAfterSwipe.body.candidates.some((c) => String(c._id) === String(targetId))
      ).toBe(false);

      // 4. Call Rewind endpoint
      const rewindRes = await request(app)
        .post(`/api/events/${eventId}/rewind`)
        .set("Authorization", `Bearer ${charlieToken}`)
        .send({});

      expect(rewindRes.status).toBe(200);
      expect(rewindRes.body.rewoundCandidate).toBeDefined();
      expect(String(rewindRes.body.rewoundCandidate._id)).toBe(String(targetId));

      // 5. Candidate is restored and available in deck again
      const deckAfterRewind = await request(app)
        .get(`/api/events/${eventId}/deck?limit=10`)
        .set("Authorization", `Bearer ${charlieToken}`);

      expect(
        deckAfterRewind.body.candidates.some((c) => String(c._id) === String(targetId))
      ).toBe(true);
    });

    it("should return 400 if user attempts to rewind when no swipes exist", async () => {
      // Use an admin or fresh user who hasn't swiped in event_cybershield
      const res = await request(app)
        .post("/api/events/event_cybershield/rewind")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/no recent swipes/i);
    });
  });
});
