import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// ¡ESTAS DOS LÍNEAS DEBEN ESTAR AQUÍ!
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { createSolicitud, fetchClientes, fetchEmpleados, fetchEquipos, fetchFotos, fetchSolicitudDetalle, updateSolicitud } from '../api/odoo';

export default function SolicitudFormScreen({ onNavigate, solicitudData }) {
    const isEditing = !!solicitudData;
    const [loading, setLoading] = useState(false);

    // Listas maestras desde Odoo
    const [equiposDb, setEquiposDb] = useState([]);
    const [clientesDb, setClientesDb] = useState([]);
    const [empleadosDb, setEmpleadosDb] = useState([]);

    // Control de Modales
    const [modalVisible, setModalVisible] = useState(null); // 'equipos', 'clientes', 'empleados'

    // Estado Principal
    const [formData, setFormData] = useState({
        name: '', // Solo lectura si editamos
        mars_title: '',
        maintenance_type: 'corrective',
        mars_oc: '',
        mars_item: '',
        // NUEVO: Generamos la fecha de hoy en formato YYYY-MM-DD que espera Odoo
        mars_emission_date: new Date().toISOString().split('T')[0],
        mars_inspector: '',
        mars_client_id: null,
        mars_applicable_norm: 'ASME B30.16 - B30.10',
        mars_diagnosis: '',
        mars_conclusions: '',
        mars_equipment_ids: [], // Array de IDs
        mars_inspector_certificate: null,
        mars_inspector_certificate_name: '',
    });

    // Estados Relacionales (One2many)
    const [fotosGenerales, setFotosGenerales] = useState([]);
    const [fotosActa, setFotosActa] = useState([]);
    const [fotosGancho, setFotosGancho] = useState([]);
    const [trabajadores, setTrabajadores] = useState([]);
    const [medidasElectricas, setMedidasElectricas] = useState({}); // Clave: equipment_id
    // NUEVO: Estado para la foto que se está editando antes de guardarla en la lista
    const [tempPhoto, setTempPhoto] = useState(null);
    // NUEVO: Índice de la foto que estamos editando (-1 para nueva foto)
    const [editingPhotoIndex, setEditingPhotoIndex] = useState(null);

    useEffect(() => {
        cargarDatosMaestros();
        if (isEditing && solicitudData?.id) {
            cargarDetallesCompletos(solicitudData.id);
        }
    }, [solicitudData]);

    // NUEVA FUNCIÓN MAESTRA DE CARGA
    const cargarDetallesCompletos = async (id) => {
        setLoading(true);
        try {
            // 1. Descargamos la data fresca directo de la base de datos
            const result = await fetchSolicitudDetalle(id);

            if (result && result.length > 0) {
                const data = result[0];

                // 2. Llenamos los textos y datos generales
                setFormData({
                    name: data.name || '',
                    mars_title: data.mars_title || '',
                    maintenance_type: data.maintenance_type || 'corrective',
                    mars_oc: data.mars_oc || '',
                    mars_item: data.mars_item || '',
                    mars_emission_date: data.mars_emission_date || new Date().toISOString().split('T')[0],
                    mars_inspector: data.mars_inspector || '',
                    mars_client_id: data.mars_client_id ? data.mars_client_id[0] : null,
                    mars_applicable_norm: data.mars_applicable_norm || 'ASME B30.16 - B30.10',
                    mars_diagnosis: data.mars_diagnosis || '',
                    mars_conclusions: data.mars_conclusions || '',
                    mars_equipment_ids: data.mars_equipment_ids || [],
                });

                // 3. Ejecutamos la descarga de las fotos con los IDs correctos
                await cargarFotosDesdeOdoo(data);
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudieron cargar los detalles de la solicitud.');
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    // NUEVA FUNCIÓN: Procesa las fotos de Odoo y las pinta en la app
    const cargarFotosDesdeOdoo = async (data) => {
        try {
            if (data.mars_photo_ids && data.mars_photo_ids.length > 0) {
                const fotos = await fetchFotos(data.mars_photo_ids);
                setFotosGenerales(fotos.map(f => ({
                    id: f.id,
                    base64: f.image,
                    type: f.photo_type,
                    equipment_id: f.equipment_id ? f.equipment_id[0] : null,
                    subtitle: f.subtitle || ''
                })));
            }
            // Hacemos lo mismo para actas y ganchos
            if (data.mars_acta_ids && data.mars_acta_ids.length > 0) {
                const actas = await fetchFotos(data.mars_acta_ids);
                setFotosActa(actas.map(f => ({ id: f.id, base64: f.image, type: f.photo_type })));
            }
            if (data.mars_gancho_ids && data.mars_gancho_ids.length > 0) {
                const ganchos = await fetchFotos(data.mars_gancho_ids);
                setFotosGancho(ganchos.map(f => ({ id: f.id, base64: f.image, type: f.photo_type })));
            }
        } catch (error) {
            console.log("Error descargando fotos:", error);
        }
    };

    const cargarDatosMaestros = async () => {
        try {
            const [eqs, clis, emps] = await Promise.all([fetchEquipos(), fetchClientes(), fetchEmpleados()]);
            setEquiposDb(eqs); setClientesDb(clis); setEmpleadosDb(emps);
        } catch (e) {
            console.log("Error cargando maestros:", e);
        }
    };

    // --- LÓGICA DE FOTOS ---

    // 1. Mostrar menú de opciones al presionar el botón "+"
    const capturarFoto = (tipo) => {
        // Validación inicial
        if (tipo === 'general' && formData.mars_equipment_ids.length === 0) {
            Alert.alert('Atención', 'Seleccione al menos un equipo en la Sección 2 antes de añadir fotos generales.');
            return;
        }

        // Menú nativo de selección
        Alert.alert(
            'Añadir Fotografía',
            '¿Desde dónde deseas capturar la imagen?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Tomar Foto', onPress: () => procesarFoto(tipo, 'camera') },
                { text: 'Galería', onPress: () => procesarFoto(tipo, 'gallery') },
            ]
        );
    };

    // 2. Ejecutar la cámara o la galería según la elección
    const procesarFoto = async (tipo, source) => {
        // Pedir el permiso correcto según la fuente
        let permissionResult;
        if (source === 'camera') {
            permissionResult = await ImagePicker.requestCameraPermissionsAsync();
        } else {
            permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        }

        if (permissionResult.status !== 'granted') {
            Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara/galería para esta función.');
            return;
        }

        // Opciones estandarizadas para Odoo
        const options = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
            base64: true,
        };

        // Lanzar la herramienta correspondiente
        let result = source === 'camera'
            ? await ImagePicker.launchCameraAsync(options)
            : await ImagePicker.launchImageLibraryAsync(options);

        // Si el usuario tomó la foto o seleccionó una
        if (!result.canceled && result.assets[0].base64) {
            const nuevaFoto = {
                base64: result.assets[0].base64,
                type: tipo,
                equipment_id: tipo === 'general' && formData.mars_equipment_ids.length === 1 ? formData.mars_equipment_ids[0] : null,
                subtitle: ''
            };

            if (tipo === 'acta') {
                setFotosActa([...fotosActa, nuevaFoto]);
            } else if (tipo === 'gancho') {
                setFotosGancho([...fotosGancho, nuevaFoto]);
            } else {
                // MODO CREACIÓN NUEVA FOTO GENERAL
                setEditingPhotoIndex(-1);
                setTempPhoto(nuevaFoto);
            }
        }
    };

    // NUEVO: Función para abrir el modal editando una foto existente
    const handleEditPhoto = (photo, index) => {
        setEditingPhotoIndex(index); // Guardamos el índice real
        setTempPhoto({ ...photo }); // Cargamos una copia en temp
    };

    // Modificar para distinguir entre Crear y Actualizar
    const confirmarFoto = () => {
        if (!tempPhoto.equipment_id) {
            Alert.alert('Error', 'Debe seleccionar a qué equipo pertenece esta foto.');
            return;
        }

        // Guardamos/Actualizamos la foto en el array correspondiente (solo general)
        if (tempPhoto.type === 'general') {
            if (editingPhotoIndex === -1) {
                // MODO CREACIÓN: Añadir al final
                setFotosGenerales([...fotosGenerales, tempPhoto]);
            } else {
                // MODO EDICIÓN: Reemplazar en el índice específico
                const updatedPhotos = [...fotosGenerales];
                updatedPhotos[editingPhotoIndex] = tempPhoto;
                setFotosGenerales(updatedPhotos);
            }
        }

        // handle acta/gancho logic... (no usa modal, no cambia)

        // Cerramos el modal y reseteamos estados
        setTempPhoto(null);
        setEditingPhotoIndex(null);
    };

    // --- LÓGICA DE EQUIPOS Y TABLAS ELÉCTRICAS ---
    const toggleEquipo = (id) => {
        let nuevosEquipos;
        if (formData.mars_equipment_ids.includes(id)) {
            nuevosEquipos = formData.mars_equipment_ids.filter(e => e !== id);
            // Eliminar tabla eléctrica si el usuario deselecciona el equipo (Igual que en Odoo)
            const nuevasMedidas = { ...medidasElectricas };
            delete nuevasMedidas[id];
            setMedidasElectricas(nuevasMedidas);
        } else {
            nuevosEquipos = [...formData.mars_equipment_ids, id];
            // Inicializar la tabla completa para el nuevo equipo con valores por defecto
            setMedidasElectricas({
                ...medidasElectricas,
                [id]: {
                    tension_nominal: '440',
                    tension_l1_l2: '',
                    tension_l1_l3: '',
                    tension_l2_l3: '',
                    corriente_datos: 'IZQ/DERECHA',
                    corriente_l1: '',
                    corriente_l2: '',
                    corriente_l3: ''
                }
            });
        }
        setFormData({ ...formData, mars_equipment_ids: nuevosEquipos });
    };

    const updateMedida = (eqId, field, value) => {
        setMedidasElectricas({
            ...medidasElectricas,
            [eqId]: { ...medidasElectricas[eqId], [field]: value }
        });
    };

    // --- LÓGICA DE PERSONAL ASIGNADO ---
    const updateTrabajador = (index, nuevoCargo) => {
        const nuevosTrabajadores = [...trabajadores];
        nuevosTrabajadores[index].job_title = nuevoCargo;
        setTrabajadores(nuevosTrabajadores);
    };

    const removeTrabajador = (index) => {
        setTrabajadores(trabajadores.filter((_, i) => i !== index));
    };

    // --- GUARDADO ---
    const handleSave = async () => {
        if (!formData.mars_title) return Alert.alert('Error', 'El título es obligatorio.');

        setLoading(true);
        try {
            // 1. Formatear Many2many
            const payload = {
                mars_title: formData.mars_title,
                maintenance_type: formData.maintenance_type,
                mars_oc: formData.mars_oc,
                mars_item: formData.mars_item,
                mars_emission_date: formData.mars_emission_date,
                mars_inspector: formData.mars_inspector,
                mars_applicable_norm: formData.mars_applicable_norm,
                mars_diagnosis: formData.mars_diagnosis,
                mars_conclusions: `<p>${formData.mars_conclusions}</p>`, // Formato HTML básico
                mars_client_id: formData.mars_client_id,
                mars_equipment_ids: [[6, 0, formData.mars_equipment_ids]], // Tupla Odoo

                // Incorporamos el certificado solo si el usuario adjuntó uno
                ...(formData.mars_inspector_certificate && {
                    mars_inspector_certificate: formData.mars_inspector_certificate,
                    mars_inspector_certificate_name: formData.mars_inspector_certificate_name,
                }),
            };

            // 2. Formatear Trabajadores (One2many)
            if (trabajadores.length > 0) {
                payload.mars_worker_ids = trabajadores.map(t => [0, 0, { employee_id: t.id, job_title: t.job_title }]);
            }

            // 3. Formatear Medidas Eléctricas (One2many)
            const tablasTuplas = Object.keys(medidasElectricas).map(eqId => ([0, 0, {
                equipment_id: parseInt(eqId),
                tension_nominal: medidasElectricas[eqId].tension_nominal,
                tension_l1_l2: parseFloat(medidasElectricas[eqId].tension_l1_l2) || 0.0,
                tension_l1_l3: parseFloat(medidasElectricas[eqId].tension_l1_l3) || 0.0,
                tension_l2_l3: parseFloat(medidasElectricas[eqId].tension_l2_l3) || 0.0,
                corriente_datos: medidasElectricas[eqId].corriente_datos,
                corriente_l1: parseFloat(medidasElectricas[eqId].corriente_l1) || 0.0,
                corriente_l2: parseFloat(medidasElectricas[eqId].corriente_l2) || 0.0,
                corriente_l3: parseFloat(medidasElectricas[eqId].corriente_l3) || 0.0,
            }]));
            if (tablasTuplas.length > 0) payload.mars_electrical_ids = tablasTuplas;

            // 4. Formatear Fotos (One2many mapeado al modelo photo)
            const formatearFotos = (arr) => arr
                .filter(f => !f.id) // Si NO tiene ID, es una foto nueva tomada desde el celular
                .map(f => [0, 0, {
                    image: f.base64,
                    photo_type: f.type,
                    equipment_id: f.equipment_id,
                    subtitle: f.subtitle
                }]);
            if (fotosGenerales.length > 0) payload.mars_photo_ids = formatearFotos(fotosGenerales);
            if (fotosActa.length > 0) payload.mars_acta_ids = formatearFotos(fotosActa);
            if (fotosGancho.length > 0) payload.mars_gancho_ids = formatearFotos(fotosGancho);

            if (isEditing) {
                await updateSolicitud(solicitudData.id, payload);
            } else {
                await createSolicitud(payload);
            }
            Alert.alert('Éxito', 'Solicitud registrada');
            onNavigate('MantenimientoList');
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE DOCUMENTOS (CERTIFICADO) ---
    const adjuntarCertificado = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'], // Permite PDFs e imágenes
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];

                // Leemos el archivo y lo convertimos a Base64
                const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: 'base64', // <-- Cambio clave: usamos texto directo
                });

                setFormData({
                    ...formData,
                    mars_inspector_certificate: base64,
                    mars_inspector_certificate_name: asset.name,
                });
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo cargar el documento.');
            console.error(error);
        }
    };

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => onNavigate('MantenimientoList')}><FontAwesome5 name="arrow-left" size={20} color="#01579b" /></TouchableOpacity>
                <Text style={styles.title}>{isEditing ? formData.name : 'Nueva Orden Mars'}</Text>
                <TouchableOpacity onPress={handleSave} disabled={loading}>
                    {loading ? <ActivityIndicator color="#01579b" /> : <Text style={styles.saveBtn}>Guardar</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>1. Datos Generales</Text>
                    <Text style={styles.label}>Título de Solicitud *</Text>
                    <TextInput style={styles.input} value={formData.mars_title} onChangeText={(v) => setFormData({ ...formData, mars_title: v })} />

                    {/* AÑADIDO: Selector de Tipo de Mantenimiento */}
                    <Text style={styles.label}>Tipo de Mantenimiento</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                        <TouchableOpacity
                            style={[styles.typeOption, formData.maintenance_type === 'corrective' && styles.typeSelected]}
                            onPress={() => setFormData({ ...formData, maintenance_type: 'corrective' })}
                        >
                            <Text style={[styles.typeText, formData.maintenance_type === 'corrective' && styles.typeTextSelected]}>Correctivo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.typeOption, formData.maintenance_type === 'preventive' && styles.typeSelected]}
                            onPress={() => setFormData({ ...formData, maintenance_type: 'preventive' })}
                        >
                            <Text style={[styles.typeText, formData.maintenance_type === 'preventive' && styles.typeTextSelected]}>Preventivo</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>Cliente</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setModalVisible('clientes')}>
                        <Text>{clientesDb.find(c => c.id === formData.mars_client_id)?.name || 'Seleccionar Cliente...'}</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Orden Compra (OC)</Text>
                            <TextInput style={styles.input} value={formData.mars_oc} onChangeText={(v) => setFormData({ ...formData, mars_oc: v })} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>ITEM</Text>
                            <TextInput style={styles.input} value={formData.mars_item} onChangeText={(v) => setFormData({ ...formData, mars_item: v })} />
                        </View>
                    </View>

                    {/* NUEVOS CAMPOS AÑADIDOS */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Fecha de Emisión</Text>
                            {/* Usamos el formato YYYY-MM-DD nativo para evitar dependencias extra */}
                            <TextInput style={styles.input} value={formData.mars_emission_date} onChangeText={(v) => setFormData({ ...formData, mars_emission_date: v })} placeholder="YYYY-MM-DD" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Inspector</Text>
                            <TextInput style={styles.input} value={formData.mars_inspector} onChangeText={(v) => setFormData({ ...formData, mars_inspector: v })} />
                        </View>
                    </View>

                    {/* NUEVO BLOQUE: CERTIFICADO DEL INSPECTOR */}
                    <Text style={styles.label}>Certificado del Inspector</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                        <TouchableOpacity
                            style={[styles.selector, { flex: 1, flexDirection: 'row', justifyContent: 'flex-start' }]}
                            onPress={adjuntarCertificado}
                        >
                            <FontAwesome5 name="paperclip" size={16} color="#7f8c8d" />
                            <Text style={{ marginLeft: 10, color: formData.mars_inspector_certificate_name ? '#01579b' : '#7f8c8d', flex: 1 }} numberOfLines={1} ellipsizeMode="middle">
                                {formData.mars_inspector_certificate_name || 'Adjuntar Documento (PDF/IMG)'}
                            </Text>
                        </TouchableOpacity>

                        {/* Botón para eliminar el archivo si ya hay uno cargado */}
                        {!!formData.mars_inspector_certificate && (
                            <TouchableOpacity
                                style={{ padding: 15, backgroundColor: '#ffeaa7', borderRadius: 6, borderWidth: 1, borderColor: '#fdcb6e' }}
                                onPress={() => setFormData({ ...formData, mars_inspector_certificate: null, mars_inspector_certificate_name: '' })}
                            >
                                <FontAwesome5 name="trash-alt" size={16} color="#d35400" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.label}>Norma Aplicable</Text>
                    <TextInput style={styles.input} value={formData.mars_applicable_norm} onChangeText={(v) => setFormData({ ...formData, mars_applicable_norm: v })} />

                    <Text style={styles.label}>Diagnóstico Inicial</Text>
                    <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Descripción del diagnóstico..." multiline value={formData.mars_diagnosis} onChangeText={(v) => setFormData({ ...formData, mars_diagnosis: v })} />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>2. Equipos Involucrados</Text>
                    <TouchableOpacity style={styles.selector} onPress={() => setModalVisible('equipos')}>
                        <Text style={{ color: '#01579b', fontWeight: 'bold' }}>{formData.mars_equipment_ids.length} Equipos Seleccionados - Editar</Text>
                    </TouchableOpacity>
                </View>

                {formData.mars_equipment_ids.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>3. Medidas Eléctricas</Text>
                        {formData.mars_equipment_ids.map(eqId => (
                            <View key={eqId} style={styles.electricalCard}>
                                <Text style={styles.electricalTitle}>{equiposDb.find(e => e.id === eqId)?.name}</Text>

                                {/* Bloque 1: Tensión */}
                                <Text style={styles.subLabel}>Tensión de Alimentación (V)</Text>
                                <View style={{ flexDirection: 'row', gap: 5, marginBottom: 15 }}>
                                    <TextInput style={[styles.input, { flex: 1.2, fontSize: 12 }]} placeholder="Nominal" value={medidasElectricas[eqId]?.tension_nominal} onChangeText={(v) => updateMedida(eqId, 'tension_nominal', v)} />
                                    <TextInput style={[styles.input, { flex: 1, fontSize: 12 }]} placeholder="L1-L2" keyboardType="numeric" value={medidasElectricas[eqId]?.tension_l1_l2} onChangeText={(v) => updateMedida(eqId, 'tension_l1_l2', v)} />
                                    <TextInput style={[styles.input, { flex: 1, fontSize: 12 }]} placeholder="L1-L3" keyboardType="numeric" value={medidasElectricas[eqId]?.tension_l1_l3} onChangeText={(v) => updateMedida(eqId, 'tension_l1_l3', v)} />
                                    <TextInput style={[styles.input, { flex: 1, fontSize: 12 }]} placeholder="L2-L3" keyboardType="numeric" value={medidasElectricas[eqId]?.tension_l2_l3} onChangeText={(v) => updateMedida(eqId, 'tension_l2_l3', v)} />
                                </View>

                                {/* Bloque 2: Corriente */}
                                <Text style={styles.subLabel}>Medidas de Corriente (A)</Text>
                                <View style={{ flexDirection: 'row', gap: 5 }}>
                                    <TextInput style={[styles.input, { flex: 1.2, fontSize: 12 }]} placeholder="Datos" value={medidasElectricas[eqId]?.corriente_datos} onChangeText={(v) => updateMedida(eqId, 'corriente_datos', v)} />
                                    <TextInput style={[styles.input, { flex: 1, fontSize: 12 }]} placeholder="L1" keyboardType="numeric" value={medidasElectricas[eqId]?.corriente_l1} onChangeText={(v) => updateMedida(eqId, 'corriente_l1', v)} />
                                    <TextInput style={[styles.input, { flex: 1, fontSize: 12 }]} placeholder="L2" keyboardType="numeric" value={medidasElectricas[eqId]?.corriente_l2} onChangeText={(v) => updateMedida(eqId, 'corriente_l2', v)} />
                                    <TextInput style={[styles.input, { flex: 1, fontSize: 12 }]} placeholder="L3" keyboardType="numeric" value={medidasElectricas[eqId]?.corriente_l3} onChangeText={(v) => updateMedida(eqId, 'corriente_l3', v)} />
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>4. Registro Fotográfico</Text>

                    <Text style={styles.label}>Fotos Generales</Text>
                    <View style={styles.photoGrid}>
                        <TouchableOpacity style={styles.addPhotoGrid} onPress={() => capturarFoto('general')}>
                            <FontAwesome5 name="plus" size={20} color="#01579b" />
                        </TouchableOpacity>

                        {/* INICIO DE CÁLCULO VISUAL */}
                        {(() => {
                            const contadores = {};

                            return fotosGenerales.map((f, i) => {
                                const eqId = f.equipment_id || 'sin_equipo';
                                contadores[eqId] = (contadores[eqId] || 0) + 1;
                                const numeroFoto = contadores[eqId];

                                const eqName = equiposDb.find(e => e.id === f.equipment_id)?.name || 'Sin equipo';

                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.photoContainerGrid}
                                        onPress={() => handleEditPhoto(f, i)}
                                    >
                                        <Image source={{ uri: `data:image/jpeg;base64,${f.base64}` }} style={styles.thumbnailLg} />

                                        <View style={styles.sequenceBadge}>
                                            <Text style={styles.sequenceText}>{numeroFoto}</Text>
                                        </View>

                                        <View style={styles.photoInfoOverlay}>
                                            <Text style={styles.photoInfoTitle} numberOfLines={1}>{eqName}</Text>
                                            {f.subtitle ? <Text style={styles.photoInfoSub} numberOfLines={1}>{f.subtitle}</Text> : null}
                                        </View>
                                    </TouchableOpacity>
                                );
                            });
                        })()}
                    </View>

                    <Text style={styles.label}>Actas de Conformidad</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        <TouchableOpacity style={styles.addPhoto} onPress={() => capturarFoto('acta')}><FontAwesome5 name="plus" size={20} color="#01579b" /></TouchableOpacity>
                        {fotosActa.map((f, i) => <Image key={i} source={{ uri: `data:image/jpeg;base64,${f.base64}` }} style={styles.thumbnail} />)}
                    </ScrollView>

                    <Text style={styles.label}>Inspección de Gancho</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity style={styles.addPhoto} onPress={() => capturarFoto('gancho')}><FontAwesome5 name="plus" size={20} color="#01579b" /></TouchableOpacity>
                        {fotosGancho.map((f, i) => <Image key={i} source={{ uri: `data:image/jpeg;base64,${f.base64}` }} style={styles.thumbnail} />)}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>5. Personal Asignado</Text>

                    <TouchableOpacity style={styles.selector} onPress={() => setModalVisible('empleados')}>
                        <Text style={{ color: '#01579b', fontWeight: 'bold' }}><FontAwesome5 name="plus" /> Añadir Empleado</Text>
                    </TouchableOpacity>

                    {trabajadores.length > 0 && (
                        <View style={{ marginTop: 15 }}>
                            {trabajadores.map((t, index) => (
                                <View key={index} style={styles.workerCard}>
                                    <View style={styles.workerInfo}>
                                        <Text style={styles.workerName}>{t.name}</Text>
                                        {/* El input nace con el cargo de Odoo, pero el usuario puede editarlo libremente */}
                                        <TextInput
                                            style={styles.workerInput}
                                            value={t.job_title}
                                            onChangeText={(v) => updateTrabajador(index, v)}
                                            placeholder="Cargo / Rol en la tarea"
                                        />
                                    </View>
                                    <TouchableOpacity style={styles.workerDelete} onPress={() => removeTrabajador(index)}>
                                        <FontAwesome5 name="trash" size={16} color="#e74c3c" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>6. Diagnóstico y Conclusiones</Text>
                    <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Diagnóstico técnico..." multiline value={formData.mars_diagnosis} onChangeText={(v) => setFormData({ ...formData, mars_diagnosis: v })} />
                    <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top', marginTop: 10 }]} placeholder="Conclusiones finales..." multiline value={formData.mars_conclusions} onChangeText={(v) => setFormData({ ...formData, mars_conclusions: v })} />
                </View>

            </ScrollView>

            {/* Modal Multi-Propósito (Simplificado para espacio) */}
            <Modal visible={!!modalVisible} animationType="slide" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.sectionTitle}>Seleccionar Datos</Text>
                        <FlatList
                            data={modalVisible === 'equipos' ? equiposDb : modalVisible === 'clientes' ? clientesDb : empleadosDb}
                            keyExtractor={i => i.id.toString()}
                            renderItem={({ item }) => {
                                const isSelected = modalVisible === 'equipos' && formData.mars_equipment_ids.includes(item.id);
                                return (
                                    <TouchableOpacity style={[styles.modalItem, isSelected && { backgroundColor: '#e3f2fd' }]} onPress={() => {
                                        if (modalVisible === 'equipos') toggleEquipo(item.id);
                                        if (modalVisible === 'clientes') {
                                            setFormData({ ...formData, mars_client_id: item.id });
                                            setModalVisible(null);
                                        }
                                        // Lógica integrada para añadir empleados con su cargo automático
                                        if (modalVisible === 'empleados') {
                                            setTrabajadores([...trabajadores, { id: item.id, name: item.name, job_title: item.job_title || '' }]);
                                            setModalVisible(null);
                                        }
                                    }}>
                                        <Text>{item.name}</Text>
                                        {isSelected && <FontAwesome5 name="check" color="#01579b" />}
                                    </TouchableOpacity>
                                );
                            }}
                        />
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(null)}>
                            <Text style={{ color: 'white' }}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* NUEVO MODAL: Detalles de la Fotografía */}
            <Modal visible={!!tempPhoto} animationType="fade" transparent>
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        <Text style={styles.sectionTitle}>Detalles de la Fotografía</Text>

                        {tempPhoto && (
                            <ScrollView>
                                <Image
                                    source={{ uri: `data:image/jpeg;base64,${tempPhoto.base64}` }}
                                    style={{ width: '100%', height: 200, borderRadius: 10, marginBottom: 15 }}
                                    resizeMode="cover"
                                />

                                <Text style={styles.label}>¿A qué equipo pertenece esta foto? *</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 15 }}>
                                    {/* Listamos SOLO los equipos que el usuario seleccionó en la Sección 2 */}
                                    {formData.mars_equipment_ids.map(eqId => {
                                        const eqName = equiposDb.find(e => e.id === eqId)?.name || 'Equipo';
                                        const isSelected = tempPhoto.equipment_id === eqId;
                                        return (
                                            <TouchableOpacity
                                                key={eqId}
                                                style={[styles.typeOption, isSelected && styles.typeSelected]}
                                                onPress={() => setTempPhoto({ ...tempPhoto, equipment_id: eqId })}
                                            >
                                                <Text style={[styles.typeText, isSelected && styles.typeTextSelected]}>{eqName}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                <Text style={styles.label}>Subtítulo / Descripción (Opcional)</Text>
                                <TextInput
                                    style={[styles.input, { marginBottom: 20 }]}
                                    placeholder="Ej: Fuga detectada en válvula..."
                                    value={tempPhoto.subtitle}
                                    onChangeText={(v) => setTempPhoto({ ...tempPhoto, subtitle: v })}
                                />

                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity style={[styles.closeBtn, { flex: 1 }]} onPress={() => setTempPhoto(null)}>
                                        <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancelar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.closeBtn, { flex: 1, backgroundColor: '#01579b' }]} onPress={confirmarFoto}>
                                        <Text style={{ color: 'white', fontWeight: 'bold' }}>
                                            {/* CAMBIO VISUAL DE TEXTO */}
                                            {editingPhotoIndex === -1 ? 'Guardar Foto' : 'Actualizar Foto'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#eee' },
    title: { fontSize: 18, fontWeight: 'bold' },
    saveBtn: { color: '#01579b', fontWeight: 'bold', fontSize: 16 },
    scroll: { padding: 15, paddingBottom: 50, backgroundColor: '#f4f7fa' },
    section: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 1 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#01579b', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
    label: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 5, marginTop: 10 },
    input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 6, backgroundColor: '#fafafa' },
    selector: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 6, backgroundColor: '#fafafa', alignItems: 'center' },
    addPhoto: { width: 80, height: 80, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed' },
    thumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 10 },
    electricalCard: { borderWidth: 1, borderColor: '#eee', padding: 10, borderRadius: 8, marginBottom: 10, backgroundColor: '#f9f9f9' },
    electricalTitle: { fontWeight: 'bold', color: '#555' },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', padding: 20, borderTopLeftRadius: 15, borderTopRightRadius: 15, height: '60%' },
    modalItem: { padding: 15, borderBottomWidth: 1, borderColor: '#eee', flexDirection: 'row', justifyContent: 'space-between' },
    closeBtn: { backgroundColor: '#e74c3c', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    typeOption: { flex: 1, padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fafafa', alignItems: 'center' },
    typeSelected: { backgroundColor: '#01579b', borderColor: '#01579b' },
    typeText: { fontWeight: 'bold', color: '#7f8c8d' },
    typeTextSelected: { color: 'white' },
    // Estilos para fotos estándar (Acta/Gancho)
    addPhoto: { width: 80, height: 80, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed' },
    thumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 10 },

    // NUEVOS ESTILOS: Para fotos generales (Más grandes y con textos)
    addPhotoLg: { width: 110, height: 110, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#ccc', borderStyle: 'dashed' },
    photoContainer: { width: 110, height: 110, marginRight: 10, position: 'relative', borderRadius: 8, overflow: 'hidden' },
    thumbnailLg: { width: '100%', height: '100%', resizeMode: 'cover' },
    photoInfoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.65)', padding: 5, justifyContent: 'center' },
    photoInfoTitle: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    photoInfoSub: { color: '#d1d8e0', fontSize: 9, marginTop: 2 },
    sequenceBadge: { position: 'absolute', top: 5, left: 5, backgroundColor: '#f39c12', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', elevation: 2 },
    sequenceText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

    workerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#eee', padding: 10, borderRadius: 8, marginBottom: 10 },
    workerInfo: { flex: 1, paddingRight: 10 },
    workerName: { fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
    workerInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', borderRadius: 4, padding: 8, fontSize: 13 },
    workerDelete: { padding: 10, justifyContent: 'center', alignItems: 'center' },
    subLabel: { fontSize: 12, fontWeight: 'bold', color: '#7f8c8d', marginBottom: 5, marginTop: 5 },

    // NUEVOS ESTILOS PARA LA CUADRÍCULA (GRID) RESPONSIVA
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start', // Alinea todo a la izquierda
        gap: 10,
        marginBottom: 15
    },
    addPhotoGrid: {
        width: '30%', // Usamos porcentajes para que entren 3 exactamente
        aspectRatio: 1, // Mantiene el botón perfectamente cuadrado
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        borderStyle: 'dashed'
    },
    photoContainerGrid: {
        width: '30%', // Mismo porcentaje que el botón
        aspectRatio: 1, // Mantiene la foto perfectamente cuadrada
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden'
    },
});