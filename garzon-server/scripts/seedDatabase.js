import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Category from "../models/categoryModel.js";
import Product from "../models/productModel.js";
import { slugify } from "../utils/slugify.js";

const categories = ["Apparel", "Accessories", "Headwear"];

const catalog = [
  { name: "NU Athletic V1", sku: "NU-APP-001", category: "Apparel", price: 800, stock: 25, images: ["/products/nu_athletic_v1_tshirt.png"] },
  { name: "NU Athletic T-Shirt V2", sku: "NU-APP-002", category: "Apparel", price: 800, stock: 25, images: ["/products/nu_athletic_v2_tshirt.png"] },
  { name: "NU Sweat Shirt", sku: "NU-APP-003", category: "Apparel", price: 1500, stock: 8, images: ["/products/nu_sweatshirt.png"] },
  { name: "NU Varsity Jacket", sku: "NU-APP-004", category: "Apparel", price: 2250, stock: 20, images: ["/products/nu_varsity_jacket.png"] },
  { name: "Hoodie Jacket", sku: "NU-APP-005", category: "Apparel", price: 1750, stock: 12, images: ["/products/nu_hoodie.png"] },
  { name: "NU Scarf V2", sku: "NU-ACC-001", category: "Accessories", price: 400, stock: 40, images: ["/products/nu_scarf_v2.png"] },
  { name: "NU Baller", sku: "NU-ACC-002", category: "Accessories", price: 100, stock: 80, images: ["/products/nu_baller.png"] },
  { name: "NU 1900 Cap", sku: "NU-HDW-001", category: "Headwear", price: 950, stock: 24, images: ["/products/nu_est_cap.png"] },
];

const seedCatalog = async () => {
  try {
    await connectDB();

    await Promise.all(categories.map((name) => Category.findOneAndUpdate(
      { name },
      { $set: { name, slug: slugify(name), isActive: true } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )));

    const categoryRecords = await Category.find({ name: { $in: categories } }).select("_id name").lean();
    const categoryIds = new Map(categoryRecords.map((category) => [category.name, category._id]));

    for (const item of catalog) {
      const { category, ...product } = item;
      const categoryId = categoryIds.get(category);
      if (!categoryId) throw new Error(`Category was not created: ${category}`);
      await Product.findOneAndUpdate(
        { sku: item.sku },
        { $set: { ...product, slug: slugify(product.name), categoryId, supplier: "Bulldogs Exchange", isActive: true } },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
      );
    }

    console.log(`Catalog seed complete: ${categories.length} categories and ${catalog.length} products upserted. No accounts were changed.`);
  } catch (error) {
    console.error(`Catalog seed failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

await seedCatalog();
