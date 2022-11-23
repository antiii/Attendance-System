var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
var exphandlebars = require('express-handlebars');
var mongoose = require('mongoose');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var _ = require('underscore');

var app = express();

app.use(cookieParser());
app.use(session({
    secret: "Shh, its a secret!",
    resave: true,
    saveUninitialized: true
}));
app.engine('handlebars', exphandlebars({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(upload.array());

var sess;
var mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
mongoose.connect('mongodb://localhost/test', {
    useNewUrlParser: true
});

var mataKuliahSchema = new mongoose.Schema({
    mataKuliahId: {
        type: Number,
        unique: true
    },
    mataKuliahName: String,
    kelas: String
});

var MataKuliah = mongoose.model("MataKuliah", mataKuliahSchema);

var userSchema = new mongoose.Schema({
    userName: String,
    userRegisterNumber: {
        type: Number,
        unique: true
    },
    userPassword: String,

});

userSchema.pre('save', function (next) {
    var self = this;
    User.find({
        userRegisterNumber: self.noInduk
    }, function (err, docs) {
        if (!docs.length) {
            next();
        } else {
            console.log('user exists: ', self.noInduk);
            next(new Error("User exists!"));
        }
    });
});

var User = mongoose.model("User", userSchema);

var jadwalKuliahSchema = new mongoose.Schema({
    mataKuliahId: {
        type: mongoose.Schema.Types.String,
        ref: 'MataKuliah'
    },
    pertemuanKe: Number,
    ruang: String,
    jamMasuk: Date,
    jamSelesai: Date,
    tahunAjaran: String,
    semester: String
});

var ambilKuliahSchema = new mongoose.Schema({
    ambilMatkulUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    mataKuliahId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MataKuliah'
    }
});

var kehadiranSchema = new mongoose.Schema({
    mataKuliahId: {
        type: mongoose.Schema.Types.String,
        ref: 'MataKuliah'
    },
    userRegisterNumber: {
        type: mongoose.Schema.Types.Number,
        ref: 'User'
    },
    semester: String,
    pertemuanKe: Number,
    status: {
        type: Boolean, default: true
    }
});

kehadiranSchema.pre('save', function (next) {
    var self = this;
    Kehadiran.find({userRegisterNumber: self.userRegisterNumber, pertemuanKe:self.pertemuanKe, semester:self.semester, 
        status:true, mataKuliahId: self.mataKuliahId}, function (err, docs) {               
        if (!docs.length) {
            next();
        }
        else {
            next(new Error("User sudah absen!"));
        }
    });
});

var Kehadiran = mongoose.model("Kehadiran", kehadiranSchema);
var Jadwal = mongoose.model("Jadwal", jadwalKuliahSchema);
var AmbilKuliah = mongoose.model("AmbilKuliah", ambilKuliahSchema);

app.get('/', function (req, res) {
    res.render('login');
});

app.post('/login', function (req, res) {
    var user = req.body;

    User.find({
        userRegisterNumber: user.noInduk,
        userPassword: user.password
    }, function (err, response) {
        if (err) throw err;
        if (response.length > 0) {
            console.log('berhasil login');
            sess = req.session;
            sess.userRegisterNumber = req.body.noInduk;
            res.cookie('SESSION_MHS', req.body.noInduk, {
                maxAge: 9000000,
                httpOnly: true
            }); //2.5 jam
            console.log('Cookies: ', req.cookies);
            console.log('login lagi');
        }
        res.redirect('anggota');
    });

});

app.get('/logout', function (req, res, next) {
    if (req.session) {
        res.clearCookie('SESSION_MHS');
        console.log(" cookie has been destroyed");
        // delete session object
        req.session.destroy(function (err) {
            if (err) {
                return next(err);
            } else {
                return res.redirect('/');
            }
        });
    }
});

app.get('/register', function (req, res) {
    res.render('register');
});

app.get('/anggota', function (req, res) {
    sess = req.session;
    if (sess.userRegisterNumber) {
        var userSess = sess;
        res.render('anggota', userSess);
    } else {
        res.redirect('/');
    }
});

app.post('/tambahmahasiswa', function (req, res) {
    var user = req.body; //Get the parsed information

    if (!user.name || !user.noInduk || !user.password) {
        res.render('anggota', {
            error: 'Sorry, you provided worng info'
        });
        console.log('wrong info!');
        return res.status(400)
            .json({
                status: '400',
                message : 'Wrong info provided'
            });
    } else {
        var newUser = new User({
            userRegisterNumber: user.noInduk,
            userName: user.name,
            userPassword: user.password
        });

        newUser.save(function (err, User) {
            if (err)
            return res.status(400)
                .json({
                    status: '400',
                    message : 'User register Number exist'
                });
            else {
                console.log('Berhasil!');
                res.redirect('/');
                return res.status(201)
                    .json({
                        status: '201',
                        message : 'Users Created'
                    });
            }
        });
    }
});

app.post('/tambahjadwal', function (req, res) {
    var jadwal = req.body;
    if (!jadwal.idMatkul || !jadwal.pertemuanKe || !jadwal.ruang || !jadwal.jamMasuk || !jadwal.jamSelesai || !jadwal.tahunAjaran || !jadwal.semester) {
        return res.status(400)
            .json({
                status: '400',
                message : 'Wrong info provided'
            });
    } else {
        MataKuliah.findOne({
            mataKuliahId: jadwal.idMatkul
        }, function (err, MataKuliah) {
            // console.log(MataKuliah)
            var newJadwal = new Jadwal({
                mataKuliahId: MataKuliah.mataKuliahId,
                pertemuanKe: jadwal.pertemuanKe,
                ruang: jadwal.ruang,
                jamMasuk: jadwal.jamMasuk,
                jamSelesai: jadwal.jamSelesai,
                tahunAjaran: jadwal.tahunAjaran,
                semester: jadwal.semester
            });         

            newJadwal.save(function (err) {
                if (err) {
                    console.log(err);
                    return res.status(400)
                    .json({
                        status: '400',
                        message : 'Create jadwal failed'
                    });
                } else {
                    console.log('Berhasil!');
                    return res.status(201)
                        .json({
                            status: '201',
                            message : 'Tambah Jadwal Created'
                        });
                }
            });
        });
    }
});

app.post('/tambahmatkul', function (req, res) {
    var matkul = req.body; //Get the parsed information  
    if (!matkul.matkulId || !matkul.name || !matkul.kelas ) {
        return res.status(400)
            .json({
                status: '400',
                message : 'Wrong info provided'
            });
    } else {
        var newMatkul = new MataKuliah({
            mataKuliahId: matkul.matkulId,
            mataKuliahName: matkul.name,
            kelas: matkul.kelas
        });
    
        newMatkul.save(function (err, MataKuliah) {
            if (err)
            return res.status(400)
                .json({
                    status: '400',
                    message : 'Error matakuliah id exist'
                });
            else {
                console.log('Berhasil!');
                // res.redirect('/')  
                return res.status(201)
                    .json({
                        status: '201',
                        message : 'Mata Kuliah Created'
                    });
            }
        });
    }
});

app.post('/tambahpeserta/:mataKuliahId/:userId', function (req, res, next) {
    MataKuliah.find({
        mataKuliahId: req.params.mataKuliahId
    }, function (err, mataKuliahFound) {
        if (err) {
            return res.status(400)
                .json({
                    status: '400',
                    message : 'Mata Kuliah not found'
                });
        }
        if (mataKuliahFound.length > 0) {
            User.find({
                userRegisterNumber: req.params.userId
            }, function (err, userFound) {
                if (err)
                    return res.status(400)
                        .json({
                            status: '400',
                            message : 'User not found'
                        });
                if (userFound.length > 0) {
                    AmbilKuliah.find({
                        mataKuliahId: mataKuliahFound[0]._id,
                        ambilMatkulUserId: userFound[0]._id
                    }, function (err, ambilMatkulFound) {
                        if (err)
                            return res.status(400)
                                .json({
                                    status: '400',
                                    message : 'Take mata kuliah failed'
                                });
                        if(ambilMatkulFound.length > 0){
                            return res.status(400)
                                        .json({
                                            status: '200',
                                            message : 'ERROR!!! mahasiswa dengan NRP: ' + userFound[0].userRegisterNumber + 
                                            ' telah terdaftar pada mata kuliah ' + mataKuliahFound[0].mataKuliahName + ' kelas ' +
                                            mataKuliahFound[0].kelas
                                        });
                        } else{
                            var newAmbilMatkul = new AmbilKuliah({
                                ambilMatkulUserId: userFound[0]._id,
                                mataKuliahId: mataKuliahFound[0]._id
                            });
                            newAmbilMatkul.save(function (err) {
                                if (err)
                                return res.status(400)
                                        .json({
                                            status: '400',
                                            message : 'Take mata kuliah failed'
                                        });
                                else {
                                    console.log('Berhasil!');
                                    return res.status(201)
                                        .json({
                                            status: '200',
                                            message : 'OK'
                                        });
                                }
                            });
                        }
                    });

                } else return res.status(400)
                        .json({
                            status: '400',
                            message : 'User not found'
                        });
            });
        } else return res.status(400)
                    .json({
                        status: '400',
                        message : 'Mata Kuliah not found'
                    });
    });
});

app.post('/absen/:ruang/:nrp', function(req, res){
    Jadwal.find({ ruang: req.params.ruang },{} , {sort: {'jamMasuk': -1}, limit: 1 }, function(err, jadwal){
        if (err) {
            console.log(err);
            return res.status(400)
                .json({
                    status: '400',
                    message : 'Ruang not found'
                });
        }
        if (jadwal.length > 0){
            User.find({ userRegisterNumber: req.params.nrp}, function(err, user){
                if (err) {
                    console.log(err);
                    return res.status(400)
                        .json({
                            status: '400',
                            message : 'User not found'
                        });
                }
                if (user.length>0){
                    
                    if (jadwal[0].jamMasuk.getTime() < new Date().getTime() && 
                        new Date().getTime() < jadwal[0].jamSelesai.getTime()) {
                        var newAbsen = new Kehadiran({
                            mataKuliahId: jadwal[0].mataKuliahId,
                            userRegisterNumber: user[0].userRegisterNumber,
                            semester: jadwal[0].semester,
                            pertemuanKe: jadwal[0].pertemuanKe,
                        });
                        newAbsen.save(function (err, Kehadiran) {
                            if (err) {
                                console.log(err);
                                return res.status(400)
                                    .json({
                                        status: '400',
                                        message : 'Already absen'
                                    });
                            }
                            else {
                                console.log('Berhasil!');
                                return res.status(201)
                                        .json({
                                            status: '200',
                                            message : 'OK'
                                        });
                            }
                        }); 
                    } else return res.status(400)
                                .json({
                                    status: '400',
                                    message : 'Jadwal not found'
                                });
                }
            });
        }
    });
});

var rekapMatkul = express.Router();

rekapMatkul.get('/:idmatkul/semester/:idsemester', function (req, res) {
    Kehadiran.find({
        mataKuliahId: req.params.idmatkul,
        semester: req.params.idsemester
    }).select('mataKuliahId userRegisterNumber semester pertemuanKe -_id').exec(function (err, rekap) {
        if (_.isEmpty(rekap)) {
            return res.status(400)
                    .json({
                        status: '400',
                        message : 'Data not exist!'
                    });
        }
        else {
            
            return res.send(rekap);
        }
    });
});

rekapMatkul.get('/:idmatkul/pertemuan/:pertemuanke', function (req, res) {
    Kehadiran.find({
        mataKuliahId: req.params.idmatkul,
        pertemuanKe: req.params.pertemuanke
    }).select('mataKuliahId userRegisterNumber semester pertemuanKe -_id').exec(function (err, rekap) {
        if (_.isEmpty(rekap)) {
            return res.status(400)
                    .json({
                        status: '400',
                        message : 'Data not exist!'
                    });
        }
        else {
            
            return res.send(rekap);
        }
    });
});

app.use('/rekap', rekapMatkul);

var rekapMhs = express.Router();

rekapMhs.get('/:nrp/semester/:idsemester', function (req, res) {
    Kehadiran.find({
        userRegisterNumber: req.params.nrp,
        semester: req.params.idsemester
    }).select('mataKuliahId userRegisterNumber semester pertemuanKe -_id').exec(function (err, rekap) {
        if (_.isEmpty(rekap)) {
            return res.status(400)
                    .json({
                        status: '400',
                        message : 'Data not exist!'
                    });
        }
        else {
            
            return res.send(rekap);
        }
    });
});

rekapMhs.get('/:nrp/matkul/:idmatkul', function (req, res) {
    Kehadiran.find({
        userRegisterNumber: req.params.nrp,
        mataKuliahId: req.params.idmatkul
    }).select('mataKuliahId userRegisterNumber semester pertemuanKe -_id').exec(function (err, rekap) {
        if (_.isEmpty(rekap)) {
            return res.status(400)
                    .json({
                        status: '400',
                        message : 'Data not exist!'
                    });
        }
        else {   
            return res.send(rekap);
        }
    });
});

app.use('/rekapmahasiswa', rekapMhs);

app.listen(3000, function (req, res) {
    console.log("App start at port 3000");
});