import Product from '../models/product.js';

// Shared by /api/products and the chat flow, so search behaves
// identically no matter which door the customer came through.
export async function searchProducts(criteria = {}) {
  const { category, brand, condition, minPrice, maxPrice, minRam, storageType } = criteria;

  const productFilter = {};
  if (category) productFilter.category = category;
  if (brand) productFilter.brand = brand;
  if (condition) productFilter.condition = condition;

  const configFilter = {};
  if (minPrice || maxPrice) {
    configFilter['configurations.price'] = {};
    if (minPrice) configFilter['configurations.price'].$gte = Number(minPrice);
    if (maxPrice) configFilter['configurations.price'].$lte = Number(maxPrice);
  }
  if (minRam) configFilter['configurations.ram'] = { $gte: Number(minRam) };
  if (storageType) configFilter['configurations.storageType'] = storageType;

  const hasConfigCriteria = Object.keys(configFilter).length > 0;

  // No config-level filter -- a plain product-level search. Still strip
  // out-of-stock configurations from the array, and drop any product left
  // with none in stock, so "browsing by category" can never surface
  // something that isn't actually available.
  if (!hasConfigCriteria) {
    return Product.aggregate([
      { $match: productFilter },
      {
        $addFields: {
          configurations: {
            $filter: {
              input: '$configurations',
              as: 'c',
              cond: { $gt: ['$$c.stockQuantity', 0] },
            },
          },
        },
      },
      { $match: { 'configurations.0': { $exists: true } } },
    ]);
  }

  // A config-level filter is present -- flatten so only the matching,
  // in-stock configuration(s) come back, not the whole product's variant list.
  configFilter['configurations.stockQuantity'] = { $gt: 0 };

  return Product.aggregate([
    { $match: productFilter },
    { $unwind: '$configurations' },
    { $match: configFilter },
  ]);
}