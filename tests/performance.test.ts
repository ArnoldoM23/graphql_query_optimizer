import { buildQuery } from "../src/buildQuery";
import { createSelectionObject } from "../src/createSelectionObject";

const complexSchema = `
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
    profile: Profile!
  }

  type Post {
    id: ID!
    title: String!
    content: String!
    author: User!
    comments: [Comment!]!
  }

  type Comment {
    id: ID!
    content: String!
    author: User!
    post: Post!
  }

  type Profile {
    id: ID!
    bio: String!
    avatar: String!
    user: User!
  }

  type Query {
    user(id: ID!): User
    post(id: ID!): Post
    users: [User!]!
    posts: [Post!]!
  }
`;

const complexSelection = {
  user: {
    id: true,
    name: true,
    email: true,
    posts: {
      id: true,
      title: true,
      content: true,
      comments: {
        id: true,
        content: true,
        author: {
          id: true,
          name: true
        }
      }
    },
    profile: {
      id: true,
      bio: true,
      avatar: true
    }
  }
};

describe("Performance Tests", () => {
  test("buildQuery performance with complex schema and selection", () => {
    const iterations = 1000;
    const startTime = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      buildQuery(complexSchema, complexSelection);
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    const opsPerSecond = (iterations / duration) * 1000;

    console.log(`buildQuery performance: ${opsPerSecond.toFixed(2)} ops/sec`);
    expect(opsPerSecond).toBeGreaterThan(100); // At least 100 ops/sec
  });

  test("createSelectionObject performance with complex schema", () => {
    const iterations = 1000;
    const startTime = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      createSelectionObject(complexSchema);
    }

    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    const opsPerSecond = (iterations / duration) * 1000;

    console.log(`createSelectionObject performance: ${opsPerSecond.toFixed(2)} ops/sec`);
    expect(opsPerSecond).toBeGreaterThan(100); // At least 100 ops/sec
  });
});
