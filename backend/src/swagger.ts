import swaggerJsDoc from "swagger-jsdoc";
import path from "path";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Abby's Robe API",
      version: "1.0.0",
      description: "Sales & inventory API for a fabric and ready-to-wear retailer",
    },
    servers: [
      {
        url: "/api/v1"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      },
    }
  },
  apis: [
  path.join(process.cwd(), "src/routes/*.ts"),
    path.join(process.cwd(), "src/swagger.ts"),
    path.join(process.cwd(), "src/swaggerSchema.ts")
  ]
}


const swaggerSpec = swaggerJsDoc(options)

export default swaggerSpec
