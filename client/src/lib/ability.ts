import { AbilityBuilder, createMongoAbility } from "@casl/ability";

export interface UserInterface {
  id: string;
  name: string;
  email: string;
  isadmin: boolean;
  avatar: string;
  is_verified: boolean;
  created_at: string;
}

const defineAbilityFor = (user: UserInterface) => {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  if (!user) {
    can("read", "post"); // read-only access to posts
    can("read", "comment"); // read-only access to comments
    return build();
  }

  if (user.isadmin) {
    can("manage", "all"); // read-write access to everything
  } else if (user.is_verified) {
    can("read", "all"); // read-only access to everything
    can("like", "post"); // can like posts
    can("comment", "post"); // can comment on posts
    can("create", "comment"); // can create comments
    can("subscribe", "author"); // can subscribe to author
    can("like", "post")
  } else {
    can("read", "post"); // read-only access to posts
  }

  return build();
};

export { defineAbilityFor };
