// // store.js
// const getState = ({ getStore, getActions, setStore }) => {
//   return {
//     store: {
//       books: [], // Lista de libros en la tienda
//       cart: [], // Carrito de compras
//       user: null, // Información del usuario
//     },
//     actions: {
//       // Cargar los libros
//       loadBooks: async () => {
//         try {
//           const response = await fetch("https://api.example.com/books");
//           const data = await response.json();
//           setStore({ books: data });
//         } catch (error) {
//           console.error("Error cargando los libros:", error);
//         }
//       },

//       // Agregar un libro al store
//       addBook: async (formData) => {
//         try {
//           // Verificamos si el libro ya existe en la base de datos
//           const response = await fetch(
//             `http://localhost:5000/libros?isbn=${formData.isbn}`
//           );
//           const data = await response.json();

//           if (data.length > 0) {
//             alert("El libro ya existe en la base de datos.");
//           } else {
//             // Si no existe, lo creamos
//             const responseCrear = await fetch("http://localhost:5000/libros", {
//               method: "POST",
//               headers: {
//                 "Content-Type": "application/json",
//               },
//               body: JSON.stringify(formData),
//             });

//             if (responseCrear.ok) {
//               const newBook = await responseCrear.json();
//               // Agregamos el nuevo libro al store
//               const store = getStore();
//               setStore({ books: [...store.books, newBook] });
//               alert("Libro creado con éxito.");
//             } else {
//               const data = await responseCrear.json();
//               alert(data.error || "Hubo un error al crear el libro");
//             }
//           }
//         } catch (error) {
//           console.error("Error en la solicitud:", error);
//           alert("Hubo un error con la solicitud: " + error.message);
//         }
//       },
//     },
//   };
// };

// export default getState;
