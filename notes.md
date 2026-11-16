- snippet para eliminar no alfanuméricos: .replace(/[^a-zA-Z0-9]+/g,'').

- Comprende la naturaleza de los elementos del código para que sepas cómo se van a comportar (strings, números, arrays, objetos, tags etc.).

- A good way of learn code is making creative experiments with the fundamental concepts.

- No adivines soluciones, experimenta en base al razonamiento.

- Cuando no tienes commits en Git no muestra las ramas con git branch y no puedes hacer git push.

- Nunca pongas fotos sin edición en la landing page. Si vas a poner imágenes, solo imágenes bien producidas.

- Aprovecha las herramientas del desarrollo web para comunicar lo que quieres en la UI. No hagas una valla publicitaria en una interfaz gráfica. Cada canal de marketing tiene su propia forma de comunicación, no traspoles a la radio lo que harías en un comercial de televisión y vice versa, cada medio tiene enfoques y técnicas aparte para que el medio sea lo más efectivo posible.

- La diferencia entre un enlace y un ancla es que el link es <a href="foo"> y el ancla usa <a name="foo">

- Mostrar parcialmente un background-image: establece el backgroud-size a más del 100% para que la imagen se desborde del contenedor y muévela para mostrar solo la parte que quieres.

- Para usar una version de un plugin con asdf, p. ej. nodejs v19.7.0, primero debes instalarla y luego correrla local o globalmente.

- A las declaraciones de CSS también se les llama "rules" en algunos documentos.

- Usa modern-normalize para establecer resets en CSS https://github.com/sindresorhus/modern-normalize. Guárdalo en un archivo aparte e impórtalo con un @import "path" en el index.css o .scss.

- A los archivos (ej. main.html, index.css etc.) en algunas partes los llaman ficheros.

- Cuando las dependencias no son parte esencial del proyecto van en "devDependencies" en el package.json. Como es el caso de ESlin y Prettier. Si las instalas sin el flag -D se van a insertar en "dependencies" y hay que moverlas.
- Con la configuración de "lint:fix": "eslint src/ --fix" en los scripts del package.json podemos ejecutar el comando npm run lint:fix en la terminal para que ESlint detecte y trate de hacer cambios automáticos.

- Para desplegar una app de NextJS ignorando las correcciones de Eslint puedes ir al archivo de next.config.js y agregas eslint: {ignoreDuringBuilds: true}. Pero esta práctica no es recomendada porque puede romper en producción.

- Command to see your Ubuntu version: lsb_release -dc.

- To highlight the eslint suggestions set the rule "eslint:recommended" within the extends property in the .eslintrc.json. 

- In code, every step most be verified. Is like a watch, each piece is key. You don't go forward if the current step doesn't works. If you forget an issue, it could be hard to find it later.

- Comandos de mongodb:
Iniciar servidor: sudo systemctl start mongod / sudo service mongod start.
Parar servidor: sudo systemctl stop mongod / sudo service mongod stop.
Ver estatus: sudo systemctl status mongod / sudo service mongod status.
Abrir mongo shell: mongosh.

- Al crear animaciones hay que mantener las dimensiones del layout consistentes a lo largo de la animación, si no, el movimiento moverá a los elementos de junto.

- En el diseño UI puedes implementar el color primario en las principales acciones que puede ejecutar el usuario, como los botones de like, submit, el enfoque en los inputs de un formulario, botones y números de la paginación, el menú de navegación, notificaciones etc.
Puedes agregar otros colores para acciones específicas que son opcionales o secundarias, como cambio de idioma, filtros, enlaces etc. pero deben resaltar sin que se pierda la consistencia con la paleta de colores.

- Cuando se trate de texto, cuando el texto no tiene fines publicitarios y la intención es transmitir solo su información no es buena idea agregar color al fondo, lo mejor es optar por una superficie con variaciones de blanco para textos negros y viceversa, para que su lectura sea lo más agradable posible. Puedes jugar con las fuentes para que la lectura sea más agradable y el texto se adecue al tono de la información que transmite, también puedes ajustar el peso del trazo, tamaño de letra y espaciameinto para remarcar la jerarquía y el ritmo de lectura.

- Escribe código siendo consciente de que no serás el único que trabajará en él.

- La creación de interfaces se trata de guiar a los usuarios para que puedan aprovechar al máximo la utilidad de un producto.

- Si actualizaste la base de datos que usa una app de NextJS tienes que revalidar los fetch calls reemplazando el endpoint con tu localhost, escribir la revalidación y verificar en tu local si se actualizaron los cambios. Es posible que halla errores y que no esté encontrando algunos datos, pero ya que la revalidación se haya hecho, haz un push con los endpoints del localhost. Después reemplaza los endpoints del localhost por los del dominio y empuja los cambios de nuevo. De esta manera la app debe de estar actualizada en el dominio. Si hubo errores al correr el servidor local, normalmente se arreglan al correr la página en el host del dominio y todos los datos deberían aparecer.

- Para ejecutar código ES6 en un proyecto node.js hay que instalar ES6 modules package (npm install --save-dev esm). Corres el archivo con el comando node -r esm file.js

- When making responsive design, use fuid adjustment instead of breakpoints. 

- Mientras no haya deadlines críticos, no generes deuda técnica. Has las cosas bien desde el principio. Y si la generas, anota que hay que arreglar ese código y arréglalo lo antes posible.

- Cuando usas fnm (Fast Node Manager) en Windows, verifica que estén las rutas de los .exe de node que has descargado en la variable de entorno PATH.

- Si winget está desactualizado y no te deja actualizarlo, puedes usar el comando de PowerShell: Add-AppxPackage -Path '.\Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle' (verifica en el repo de github la última versión del paquete).
