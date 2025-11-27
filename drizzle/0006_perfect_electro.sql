CREATE TABLE "app_verification_token" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "app_verification_token_identifier_token_pk" PRIMARY KEY("identifier","token")
);
