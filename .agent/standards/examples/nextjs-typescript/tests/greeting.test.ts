import { expect, test } from "vitest";
import { GET } from "../src/app/api/greeting/route.ts";
import { greeting } from "../src/lib/services/greeting.ts";

test("service trims a valid name", () => {
  expect(greeting("  Ada  ")).toBe("Hello, Ada!");
});

test.each(["", "   ", "x".repeat(51)])(
  "service rejects invalid name %s",
  (name) => {
    expect(() => greeting(name)).toThrow(RangeError);
  },
);

test("route returns a greeting", async () => {
  const response = GET(new Request("http://localhost/api/greeting?name=Ada"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ message: "Hello, Ada!" });
});

test("route returns safe validation errors", async () => {
  const response = GET(
    new Request("http://localhost/api/greeting?name=%20%20"),
  );
  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({
    error: "Name must contain 1 to 50 characters.",
  });
});
