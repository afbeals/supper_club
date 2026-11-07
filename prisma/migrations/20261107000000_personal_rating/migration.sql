ALTER TABLE "Post" ADD COLUMN "personalRating" INTEGER CHECK ("personalRating" IS NULL OR "personalRating" BETWEEN 1 AND 10);
