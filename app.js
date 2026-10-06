const URL = "./modelo/";

let model;
let webcam;
let maxPredictions;

let ejecutando = false;
let animationId = null;

let ultimaClaseGuardada = "";


/*
    Carga el modelo de Teachable Machine
*/
async function cargarModelo() {

    if (model) {
        return;
    }

    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmImage.load(modelURL, metadataURL);

    maxPredictions = model.getTotalClasses();
}


/*
    Iniciar cámara
*/
async function iniciarCamara() {

    if (ejecutando) {
        return;
    }

    try {

        await cargarModelo();

        const contenedor =
            document.getElementById("webcam-container");

        contenedor.innerHTML = "";

        webcam = new tmImage.Webcam(
            300,
            300,
            true
        );

        await webcam.setup();
        await webcam.play();

        contenedor.appendChild(webcam.canvas);

        ejecutando = true;

        document.getElementById("btn-iniciar").disabled = true;
        document.getElementById("btn-parar").disabled = false;

        loop();

    } catch (error) {

        document.getElementById("mensaje-resultado").innerHTML =
            "No se ha podido iniciar la cámara.";

        console.error(error);
    }
}


/*
    Bucle de la webcam
*/
async function loop() {

    if (!ejecutando) {
        return;
    }

    webcam.update();

    await predecir(webcam.canvas, false);

    animationId = window.requestAnimationFrame(loop);
}


/*
    Parar cámara
*/
function pararCamara() {

    ejecutando = false;

    if (animationId) {
        window.cancelAnimationFrame(animationId);
    }

    if (webcam) {
        webcam.stop();
    }

    document.getElementById("webcam-container").innerHTML =
        '<p id="mensaje-camara">Cámara detenida</p>';

    document.getElementById("btn-iniciar").disabled = false;
    document.getElementById("btn-parar").disabled = true;

    document.getElementById("mensaje-resultado").innerHTML =
        "Clasificación detenida.";
}


/*
    Realizar predicción
*/
async function predecir(imagen, guardarSiempre) {

    await cargarModelo();

    const prediction = await model.predict(imagen);

    mostrarPredicciones(prediction);

    let mejorResultado = prediction[0];

    for (let i = 1; i < prediction.length; i++) {

        if (
            prediction[i].probability >
            mejorResultado.probability
        ) {
            mejorResultado = prediction[i];
        }
    }

    const porcentaje =
        mejorResultado.probability * 100;

    const minimo =
        Number(document.getElementById("umbral").value);

    const nombre =
        obtenerNombre(mejorResultado.className);


    if (porcentaje >= minimo) {

        document.getElementById("mensaje-resultado").innerHTML =
            "Se ha detectado <strong>" +
            nombre +
            "</strong> con una confianza del <strong>" +
            porcentaje.toFixed(2) +
            "%</strong>.";

        /*
            En webcam solo guardamos cuando cambia
            el objeto detectado para no llenar el historial.
        */
        if (
            guardarSiempre ||
            ultimaClaseGuardada !== nombre
        ) {

            guardarHistorial(
                nombre,
                porcentaje
            );

            ultimaClaseGuardada = nombre;
        }

    } else {

        document.getElementById("mensaje-resultado").innerHTML =
            "No hay suficiente coincidencia. " +
            "El resultado más alto es " +
            nombre +
            " con " +
            porcentaje.toFixed(2) +
            "%.";
    }
}


/*
    Mostrar porcentajes
*/
function mostrarPredicciones(prediction) {

    const contenedor =
        document.getElementById("label-container");

    contenedor.innerHTML = "";

    for (let i = 0; i < prediction.length; i++) {

        const nombre =
            obtenerNombre(prediction[i].className);

        const porcentaje =
            prediction[i].probability * 100;

        const resultado =
            document.createElement("div");

        resultado.className = "resultado";

        resultado.innerHTML = `
            <div class="resultado-superior">

                <span>${nombre}</span>

                <span>
                    ${porcentaje.toFixed(2)}%
                </span>

            </div>

            <div class="barra">

                <div
                    class="barra-interior"
                    style="width: ${porcentaje}%">
                </div>

            </div>
        `;

        contenedor.appendChild(resultado);
    }
}


/*
    Cambiamos Class 3 por el nombre real
*/
function obtenerNombre(nombre) {

    if (nombre === "Class 3") {
        return "Funda de gafas";
    }

    return nombre;
}


/*
    Actualizar porcentaje mínimo
*/
function actualizarUmbral() {

    const valor =
        document.getElementById("umbral").value;

    document.getElementById("valor-umbral").innerHTML =
        valor + "%";
}


/*
    Subir y clasificar una imagen
*/
async function cargarImagen(event) {

    const archivo = event.target.files[0];

    if (!archivo) {
        return;
    }

    await cargarModelo();

    const imagen =
        document.getElementById("imagen-preview");

    const lector = new FileReader();

    lector.onload = function(e) {

        imagen.src = e.target.result;

        imagen.style.display = "inline-block";

        imagen.onload = async function() {

            await predecir(
                imagen,
                true
            );
        };
    };

    lector.readAsDataURL(archivo);
}


/*
    Guardar historial
*/
function guardarHistorial(nombre, porcentaje) {

    const historial =
        document.getElementById("historial");

    const vacio =
        document.getElementById("historial-vacio");

    if (vacio) {
        vacio.remove();
    }

    const fecha =
        new Date().toLocaleString();

    const elemento =
        document.createElement("div");

    elemento.className =
        "elemento-historial";

    elemento.innerHTML = `
        <strong>${nombre}</strong>
        - ${porcentaje.toFixed(2)}%

        <br>

        <span class="fecha">
            ${fecha}
        </span>
    `;

    historial.prepend(elemento);
}


/*
    Borrar historial
*/
function borrarHistorial() {

    const historial =
        document.getElementById("historial");

    historial.innerHTML = `
        <p id="historial-vacio">
            Todavía no hay resultados.
        </p>
    `;

    ultimaClaseGuardada = "";
}