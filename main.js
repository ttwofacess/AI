
// Importa la función para crear el motor de IA usando un Web Worker
import { CreateWebWorkerMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

// Función de utilidad para seleccionar elementos del DOM fácilmente
const $ = el => document.querySelector(el);

// Selección de elementos del DOM
const $form = $('form'); // Formulario principal
const $input = $('textarea'); // Área de texto para mensajes
const $template = $('#message-template'); // Template para mensajes
const $messages = $('ul'); // Lista de mensajes
const $container = $('main'); // Contenedor principal
const $button = $('#submit-button'); // Botón de enviar
const $info = $('small'); // Elemento para mostrar información
const $loading = $('.loading'); // Elemento de carga
const $modelSelect = $('#model-select'); // Selector de modelo IA

// Variables de estado
let messages = []; // Historial de mensajes
let end = false; // Indica si la carga terminó

// Elementos y variables para adjuntar archivos
const $fileInput = $('#file-input'); // Input de archivos
const $attachButton = $('#attach-button'); // Botón de adjuntar
let attachedFileContent = null; // Contenido del archivo adjunto

// Evento para abrir el selector de archivos al hacer clic en el botón de adjuntar
$attachButton.addEventListener('click', () => {
  $fileInput.click();
});

// Evento para manejar la selección de un archivo y leer su contenido
$fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    try {
      // Lee el contenido del archivo como texto
      const text = await file.text();
      attachedFileContent = {
        name: file.name,
        content: text
      };
      // Agrega el nombre del archivo al área de texto
      $input.value += `\n\nArchivo adjunto: ${file.name}`;
      // Ajusta la altura del textarea
      $input.style.height = $input.scrollHeight + 'px';
    } catch (error) {
      // Muestra error si ocurre al leer el archivo
      console.error('Error reading file:', error);
    }
  }
});

// Variables para el modelo seleccionado y el motor de IA
let SELECTED_MODEL = '';
let engine = null;

// Evento para cambiar el modelo de IA seleccionado
$modelSelect.addEventListener('change', async (event) => {
  SELECTED_MODEL = event.target.value;
  // Deshabilita el botón de enviar mientras se carga el modelo
  $button.setAttribute('disabled', '');
  // Crea el motor de IA usando un Web Worker y el modelo seleccionado
  engine = await CreateWebWorkerMLCEngine(
    new Worker('./worker.js', { type: 'module' }),
    SELECTED_MODEL,
    {
      // Callback para mostrar el progreso de carga
      initProgressCallback: (info) => {
        $info.textContent = info.text;
        // Cuando termina la carga, habilita el botón y muestra mensaje de bienvenida
        if (info.progress === 1 && !end) {
          end = true;
          $loading?.parentNode?.removeChild($loading);
          if (SELECTED_MODEL) {
            $button.removeAttribute('disabled');
          }
          addMessage("¡Hola! Soy una IA que se ejecuta completamente en tu navegador. ¿En qué puedo ayudarte hoy?", 'bot');
          $input.focus();
        }
      }
    }
  );
});

// Evento para ajustar la altura del textarea dinámicamente según el contenido
$input.addEventListener('input', () => {
  $input.style.height = 'auto'; // Restablece la altura
  $input.style.height = $input.scrollHeight + 'px'; // Ajusta a la altura del contenido
});

// Evento para manejar el envío del formulario (mensaje del usuario)
$form.addEventListener('submit', async (event) => {
  event.preventDefault(); // Previene el comportamiento por defecto
  const messageText = $input.value.trim(); // Obtiene el texto del mensaje
  if (messageText !== '') {
    $input.value = '';
  }
  // Agrega el mensaje del usuario al DOM
  addMessage(messageText, 'user');
  $button.setAttribute('disabled', ''); // Deshabilita el botón mientras responde
  // Crea el objeto de mensaje para el historial
  const userMessage = {
    role: 'user',
    content: messageText
  };
  messages.push(userMessage); // Agrega al historial
  $input.style.height = 'auto'; // Restablece altura
  try {
    // Solicita respuesta a la IA usando el motor creado
    const chunks = await engine.chat.completions.create({
      messages,
      stream: true
    });
    let reply = "";
    // Agrega un mensaje vacío del bot al DOM para ir actualizando
    const $botMessage = addMessage("", 'bot');
    // Itera sobre los fragmentos de respuesta de la IA
    for await (const chunk of chunks) {
      const choice = chunk.choices[0];
      const content = choice?.delta?.content ?? "";
      reply += content;
      // Sanitiza la respuesta antes de mostrarla
      const sanitizedReply = DOMPurify.sanitize(reply);
      $botMessage.textContent = sanitizedReply;
    }
    // Agrega la respuesta final al historial
    messages.push({
      role: 'assistant',
      content: reply
    });
  } catch (error) {
    // Muestra error si ocurre al procesar la solicitud
    console.error('Error:', error);
    addMessage("Hubo un error al procesar tu solicitud. Por favor, inténtalo de nuevo.", 'bot');
  } finally {
    // Habilita el botón de enviar nuevamente
    $button.removeAttribute('disabled');
  }
  // Hace scroll al final del contenedor de mensajes
  $container.scrollTop = $container.scrollHeight;
});

// Función para agregar un mensaje al DOM
function addMessage(text, sender) {
  // Sanitiza el texto antes de insertarlo
  const sanitizedText = DOMPurify.sanitize(text);
  // Clona el template de mensaje
  const clonedTemplate = $template.content.cloneNode(true);
  const $newMessage = clonedTemplate.querySelector('.message');
  const $who = $newMessage.querySelector('span');
  const $text = $newMessage.querySelector('p');
  // Inserta el texto y el remitente
  $text.textContent = sanitizedText;
  $who.textContent = sender === 'bot' ? 'IA' : 'Tú';
  $newMessage.classList.add(sender);
  // Agrega el mensaje a la lista
  $messages.appendChild($newMessage);
  // Hace scroll al final
  $container.scrollTop = $container.scrollHeight;
  return $text;
}
