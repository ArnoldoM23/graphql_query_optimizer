/**
 * @fileoverview
 * Demo file showcasing the GraphQL Query Optimizer library.
 */
import { 
  createSelectionObject, 
  buildQuery, 
  createOptimizedQuery, 
  SelectionObject
} from './src';

// Example schema with posts
const schema = `
  type Query {
    user: User
    users: [User!]!
    search: SearchResult
    posts: [Post!]!
    post(id: ID!): Post
  }

  type User {
    id: ID!
    name: String!
    email: String
    address: Address
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    content: String
    author: User!
    comments: [Comment!]!
    createdAt: String
    updatedAt: String
  }

  type Comment {
    id: ID!
    content: String!
    author: User!
    createdAt: String
  }

  type Address {
    street: String
    city: String
    country: String
    zipCode: String
  }

  union SearchResult = User | Post
`;

console.log('Example 1: Manual field selection');
const selection = createSelectionObject(schema, { includeTypename: true });
selection.user = {
  id: true,
  name: true,
  email: true
};
selection.users = {
  address: {
    country: true
  },
  posts: {
    author: {
      name: true
    },
    comments: {
      author: {
        name: true
      }
    }
  }
};
selection.search = {
  __typename: true,
  on_User: {
    address: {
      country: true
    },
    posts: {
      author: {
        name: true
      },
      comments: {
        author: {
          name: true
        }
      }
    }
  },
  on_Post: {
    author: {
      address: {
        country: true
      },
      posts: {
        title: true
      }
    },
    comments: {
      author: {
        address: {
          country: true
        },
        posts: {
          title: true
        }
      }
    }
  }
};
selection.posts = {
  id: true,
  title: true
};
console.log(buildQuery(schema, selection));

console.log('\nExample 2: Using createOptimizedQuery');
const query2 = createOptimizedQuery(schema, (selection) => {
  selection.user = {
    address: {
      country: true
    },
    posts: {
      author: {
        name: true
      },
      comments: {
        author: {
          name: true
        }
      }
    }
  };
  selection.users = {
    id: true,
    name: true,
    address: {
      country: true
    }
  };
  selection.search = {
    __typename: true,
    on_User: {
      address: {
        country: true
      },
      posts: {
        author: {
          name: true
        },
        comments: {
          author: {
            name: true
          }
        }
      }
    },
    on_Post: {
      author: {
        address: {
          country: true
        },
        posts: {
          title: true
        }
      },
      comments: {
        author: {
          address: {
            country: true
          },
          posts: {
            title: true
          }
        }
      }
    }
  };
  selection.posts = {
    author: {
      address: {
        country: true
      },
      posts: {
        title: true
      }
    },
    comments: {
      author: {
        address: {
          country: true
        },
        posts: {
          title: true
        }
      }
    }
  };
});
console.log(query2);

console.log('\nExample 3: Post-specific queries');
const postQuery = createOptimizedQuery(schema, (selection) => {
  selection.post = {
    id: true,
    title: true,
    content: true,
    author: {
      name: true,
      email: true
    },
    comments: {
      content: true,
      author: {
        name: true
      },
      createdAt: false
    },
    createdAt: true,
    updatedAt: true
  };
});
console.log(postQuery);

console.log('\nExample 4: Posts list with nested data');
const postsListQuery = createOptimizedQuery(schema, (selection) => {
  selection.posts = {
    id: true,
    title: true,
    content: true,
    author: {
      name: true,
      email: true,
      address: {
        country: true
      }
    },
    comments: {
      content: true,
      author: {
        name: true,
        email: true
      },
      createdAt: true
    },
    createdAt: true,
    updatedAt: true
  };
});
console.log(postsListQuery);

console.log('\nExample 5: Union type');
const unionQuery = createOptimizedQuery(schema, (selection) => {
  selection.search = {
    __typename: true,
    on_User: {
      name: true
    },
    on_Post: {
      id: true,
      title: true
    }
  };
});
console.log(unionQuery);

console.log('\nExample 6: Using createSelectionObject for specific post query');
// First, create the selection object with all fields set to false
const postSelection = createSelectionObject(schema, { includeTypename: true });
console.log("postSelection========================>", postSelection);
// Now, let's modify the selection for a specific post query
// We'll only select id, title, content, and author's name, address.country
postSelection.post = {
  id: true,
  title: true,
  content: true,
  author: {
    name: true,
    email: true,
  },
  comments: {
    content: true,
    author: {
      name: true,
      email: true,
      address: {
        country: false,
        city: true,
        street: true,
        zipCode: true
      }
    }
  }
};

// Build the query using the modified selection
const specificPostQuery = buildQuery(schema, postSelection);
console.log('Generated query for specific post:');
console.log("specificPostQuery========================>", specificPostQuery); 