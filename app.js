// Ver 1.1
// on va donc démarrer une nouvelle version
var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent');     

// Tableau des utilisateurs connectés (en attente)
var users = [];

// Tableau des tâches en cours 
// {name:string , task:string}
// Name: pseudo du créateur de la tache  task: descriptif de la tache
var tasks = [];

// Chargement de la page index.html
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
})

.use(function(req, res, next){
    res.redirect('/');
});

io.on('connection', function (socket) {
        
    
    function emit_to_all(message,data) {

        // Envoie à tous et uniquement aux sockets qui ont un pseudo
        // Si on utilise io.sockets.emit même ceux qui n'ont pas encore de pesudo recoivent le message
        // Une autre solution pour régler ce problème ?
       
        Object.keys(io.sockets.sockets).forEach(function (id) {
            var sock = io.sockets.connected[id];

            // Si le socket à un pseudo on lui envoie le message
            if (typeof sock.pseudo !== 'undefined') {
                sock.emit(message, data);
            }
        })    
    }

    // Connexion d'un nouveau client
    socket.on('nouveau_client', function(pseudo) {
        pseudo = ent.encode(pseudo);

        // on teste si un client est déjà connecté avec le même pseudo
        if (users.indexOf(pseudo) > -1) {
            socket.emit('user_error', pseudo + ' est déjà utilisé');
        } 
        else {
            socket.pseudo = pseudo;
            users.push(pseudo);

            //On envoie a tout le monde la liste des utilisateurs connectés           
            emit_to_all('refresh_users_list', users);

            // on envoie la liste des taches à l'utilisateur qui vient de se connecter
            socket.emit('refresh_task_list', tasks);
        }
    });

    // Le client vient de se déconnecter
    socket.on('disconnect', function () {
        if (typeof socket.pseudo !== 'undefined') {
            var ind = users.indexOf(socket.pseudo);
            if (ind > -1) {
                users.splice(ind,1);

                //On envoie a tout le monde la liste des utilisateurs connectés
                emit_to_all('refresh_users_list', users);
            }
        }
    });

    // Ajout d'une tâche reçue d'un utilisateur
    socket.on('new_task', function (data) {
        data = ent.encode(data);       
        tasks.push({name:socket.pseudo,task:data});

        // on envoie la liste des tâches actualisée à tout le monde
        emit_to_all('refresh_task_list', tasks);
    });

    // Supression d'une tâche par un utilisateur
    socket.on('delete_task', function(index) {
        index = ent.encode(index);
        if ( tasks[index] !== undefined ) {
            tasks.splice(index,1);

            // on envoie la liste des tâches actualisée à tout le monde
            emit_to_all('refresh_task_list', tasks);
        }
    });
});

server.listen(8080);
