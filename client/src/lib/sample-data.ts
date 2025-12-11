export const sampleDSL = `Entity Store:
  store_id PK
  name
  address Composite:
    street
    city
    zip
  phones Multivalued

Entity Product:
  product_id PK
  name
  price

Weak Entity OrderItem:
  quantity
  price
  Identified By Order.order_id + Product.product_id

Entity Order:
  order_id PK
  order_date
  total Derived

Entity Supplier:
  supplier_id PK
  name
  contact_email

Relation Store (1) — (M) Product: sells

Identifying Relation Order (1) — (M) OrderItem: contains

Relation Product (M, partial) — (M, partial) Supplier: supplies
  supply_date
  cost`;
