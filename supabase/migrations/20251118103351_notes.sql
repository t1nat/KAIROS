create table if not exists note (
  id integer generated always as identity primary key,

  createdById varchar(255) not null references app_user(id),

  content text not null default '',

  lockPasswordHash varchar(255),

  isLocked boolean not null default false,

  createdAt timestamptz not null default now(),

  updatedAt timestamptz
);

create index if not exists note_created_by_idx on note (createdById);
