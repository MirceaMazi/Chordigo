import { expect, it } from "vitest";
import { PendingWrites } from "./pending-writes";

it("retains a failed write and saves the final snapshot only after its observations", async () => {
  const queue = new PendingWrites();
  const order: string[] = [];
  let blocked = true;
  await expect(
    queue.add(async () => {
      if (blocked) throw new Error("Storage unavailable");
      order.push("observation");
    }),
  ).rejects.toThrow("Storage unavailable");
  await expect(
    queue.add(async () => {
      order.push("recap");
    }),
  ).rejects.toThrow();
  expect(order).toEqual([]);
  blocked = false;
  await queue.flush();
  await queue.flush();
  expect(order).toEqual(["observation", "recap"]);
});

it("serializes writes added while an earlier transaction is still running", async () => {
  const queue = new PendingWrites();
  const order: number[] = [];
  let release!: () => void;
  const first = queue.add(async () => {
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    order.push(1);
  });
  const second = queue.add(async () => {
    order.push(2);
  });
  expect(order).toEqual([]);
  release();
  await Promise.all([first, second]);
  expect(order).toEqual([1, 2]);
});
