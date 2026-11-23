<?php
/**
 * Plugin Name: FMS Equipment Data
 * Description: Source-backed farm machine catalog, reference specs, parts and comparison / unit conversion tools.
 * Version: 1.0.0
 * Requires PHP: 8.0
 * Text Domain: fms-data
 */
if(!defined('ABSPATH')){exit;}

function fms_data_register() {
    register_post_type('fms_machine', [
        'labels'=>['name'=>'Machines','singular_name'=>'Machine','add_new_item'=>'Add machine','edit_item'=>'Edit machine'],
        'public'=>true,'has_archive'=>true,'rewrite'=>['slug'=>'machines'],'show_in_rest'=>true,
        'menu_icon'=>'dashicons-admin-tools','supports'=>['title','editor','excerpt','thumbnail','revisions'],
    ]);
    register_post_type('fms_part', [
        'labels'=>['name'=>'Parts references','singular_name'=>'Part reference','add_new_item'=>'Add part reference'],
        'public'=>true,'has_archive'=>true,'rewrite'=>['slug'=>'parts'],'show_in_rest'=>true,
        'menu_icon'=>'dashicons-hammer','supports'=>['title','editor','excerpt','thumbnail','revisions'],
    ]);
    register_taxonomy('fms_brand',['fms_machine','fms_part'],[
        'labels'=>['name'=>'Manufacturers','singular_name'=>'Manufacturer'],'public'=>true,'show_in_rest'=>true,
        'hierarchical'=>true,'rewrite'=>['slug'=>'brands']
    ]);
    register_taxonomy('fms_equipment_type','fms_machine',[
        'labels'=>['name'=>'Equipment types','singular_name'=>'Equipment type'],'public'=>true,'show_in_rest'=>true,
        'hierarchical'=>true,'rewrite'=>['slug'=>'equipment-types']
    ]);
}
add_action('init','fms_data_register');
function fms_data_activate(){fms_data_register();flush_rewrite_rules();}
register_activation_hook(__FILE__,'fms_data_activate');
register_deactivation_hook(__FILE__,'flush_rewrite_rules');

function fms_data_fields(){
    return [
        'fms_model_years'=>['Production years','Identification'],
        'fms_engine_make'=>['Engine manufacturer/model','Engine'],
        'fms_engine_hp'=>['Engine horsepower (HP)','Engine'],
        'fms_pto_hp'=>['PTO horsepower (HP)','PTO & hitch'],
        'fms_pto_rpm'=>['PTO speed (RPM)','PTO & hitch'],
        'fms_hitch_category'=>['Three-point hitch category','PTO & hitch'],
        'fms_hitch_lift_24_lb'=>['3-point hitch lift capacity at 24 in behind lift points (lb)','PTO & hitch'],
        'fms_hydraulic_flow_gpm'=>['Published hydraulic pump flow (US GPM; see notes)','Hydraulics'],
        'fms_loader_lift_lb'=>['Loader lift capacity (lb; specify test point in notes)','Hydraulics'],
        'fms_operating_weight_lb'=>['Published base/ROPS weight (lb; verify configuration)','Dimensions & weight'],
        'fms_fuel_capacity_gal'=>['Fuel capacity (US gal)','Capacities'],
        'fms_configuration_notes'=>['Model year / drive / loader / test-point notes','Identification'],
        'fms_source_url'=>['Primary source URL','Provenance'],
        'fms_source_checked'=>['Source checked date (YYYY-MM-DD)','Provenance'],
    ];
}
function fms_data_metabox(){add_meta_box('fms_specs_box','Verified machine facts / source','fms_data_metabox_render','fms_machine','normal','high');}
add_action('add_meta_boxes','fms_data_metabox');
function fms_data_metabox_render($post){
    wp_nonce_field('fms_specs_save','fms_specs_nonce');
    echo '<p><strong>Data quality:</strong> Record only documented values for the exact configuration. Missing values must remain empty. Include the original source and date checked.</p>';
    foreach(fms_data_fields() as $key=>$info){
        $val=get_post_meta($post->ID,$key,true);
        echo '<p><label for="'.esc_attr($key).'"><strong>'.esc_html($info[0]).'</strong> <small>('.esc_html($info[1]).')</small></label><br><input style="width:100%;max-width:720px" type="'.($key==='fms_source_url'?'url':'text').'" id="'.esc_attr($key).'" name="'.esc_attr($key).'" value="'.esc_attr($val).'"></p>';
    }
}
function fms_data_save($post_id){
    if(!isset($_POST['fms_specs_nonce'])||!wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['fms_specs_nonce'])),'fms_specs_save'))return;
    if(defined('DOING_AUTOSAVE')&&DOING_AUTOSAVE)return;
    if(!current_user_can('edit_post',$post_id))return;
    foreach(fms_data_fields() as $key=>$info){
        if(!isset($_POST[$key])||!is_scalar($_POST[$key]))continue;
        $value=wp_unslash($_POST[$key]);
        if($key==='fms_source_url'){$value=esc_url_raw($value);}
        elseif($key==='fms_source_checked'){$value=sanitize_text_field($value); if($value!==''&&!preg_match('/^\d{4}-\d{2}-\d{2}$/',$value))$value='';}
        else {$value=sanitize_text_field($value);}
        if(in_array($key,fms_data_numeric_fields(),true)&&$value!==''&&(!is_numeric($value)||(float)$value<0))$value='';
        if($value===''){delete_post_meta($post_id,$key);}else{update_post_meta($post_id,$key,$value);}
    }
}
add_action('save_post_fms_machine','fms_data_save');

function fms_data_numeric_fields(){return ['fms_engine_hp','fms_pto_hp','fms_pto_rpm','fms_hitch_lift_24_lb','fms_hydraulic_flow_gpm','fms_loader_lift_lb','fms_operating_weight_lb','fms_fuel_capacity_gal'];}
function fms_render_specs($id){
    $fields=fms_data_fields();$grouped=[];
    foreach($fields as $key=>$info){
        if(in_array($key,['fms_source_url','fms_source_checked'],true))continue;
        $value=get_post_meta($id,$key,true);
        if($value==='')continue;
        $grouped[$info[1]][]=[$info[0],$value];
    }
    if(!$grouped){echo '<p class="notice">Specifications for this configuration have not yet been source-verified.</p>';return;}
    foreach($grouped as $group=>$rows){
        echo '<table class="fms-specs"><caption>'.esc_html($group).'</caption><tbody>';
        foreach($rows as $row){echo '<tr><th scope="row">'.esc_html($row[0]).'</th><td>'.esc_html($row[1]).'</td></tr>';}
        echo '</tbody></table>';
    }
}
function fms_render_source($id){
    $url=get_post_meta($id,'fms_source_url',true);
    $date=get_post_meta($id,'fms_source_checked',true);
    echo '<section class="sources"><h2>Sources & verification</h2>';
    if($url){echo '<p>Primary technical reference: <a href="'.esc_url($url).'" rel="noopener noreferrer nofollow" target="_blank">'.esc_html($url).'</a></p>';}
    else{echo '<p>Original source link has not yet been added; do not treat undocumented values as authoritative.</p>';}
    if($date){echo '<p>Source last checked: '.esc_html($date).'</p>';}
    echo '<p>Specs may vary by market, serial number, year and installed equipment. Refer to the official manual for service and safety decisions.</p></section>';
}
function fms_compare_shortcode(){
    $machines=get_posts(['post_type'=>'fms_machine','post_status'=>'publish','posts_per_page'=>300,'orderby'=>'title','order'=>'ASC','fields'=>'ids']);
    if(!$machines){return '<p>No verified machine records have been published yet. Please check back when the new catalog launches.</p>';}
    $a=isset($_GET['machine_a'])?absint($_GET['machine_a']):0;
    $b=isset($_GET['machine_b'])?absint($_GET['machine_b']):0;
    $html='<div class="tool-panel"><form method="get"><div class="form-grid">';
    foreach(['machine_a'=>'First machine','machine_b'=>'Second machine'] as $key=>$label){
        $sel=$key==='machine_a'?$a:$b;
        $html.='<label><span>'.esc_html($label).'</span><select name="'.esc_attr($key).'"><option value="">Choose a model</option>';
        foreach($machines as $id){$html.='<option value="'.esc_attr($id).'" '.selected($sel,$id,false).'>'.esc_html(get_the_title($id)).'</option>';}
        $html.='</select></label>';
    }
    $html.='</div><button class="btn" type="submit">Compare specs</button></form></div>';
    if(!$a||!$b)return $html;
    if($a===$b)return $html.'<p class="notice">Choose two different machines.</p>';
    if(!in_array($a,$machines,true)||!in_array($b,$machines,true))return $html.'<p class="notice">One of the selected machines is unavailable.</p>';
    $html.='<div class="tool-panel"><div style="overflow-x:auto"><table class="fms-compare-table"><thead><tr><th>Specification</th><th><a href="'.esc_url(get_permalink($a)).'">'.esc_html(get_the_title($a)).'</a></th><th><a href="'.esc_url(get_permalink($b)).'">'.esc_html(get_the_title($b)).'</a></th></tr></thead><tbody>';
    foreach(fms_data_fields() as $key=>$info){
        if(in_array($key,['fms_source_url','fms_source_checked','fms_configuration_notes'],true))continue;
        $va=get_post_meta($a,$key,true);$vb=get_post_meta($b,$key,true);
        if($va===''&&$vb==='')continue;
        $html.='<tr><th scope="row">'.esc_html($info[0]).'</th><td>'.esc_html($va!==''?$va:'Not verified').'</td><td>'.esc_html($vb!==''?$vb:'Not verified').'</td></tr>';
    }
    $html.='</tbody></table></div>';
    $html.='<div class="fms-compare-notes"><h3>Source and configuration notes</h3>';
    foreach ([$a, $b] as $machine_id) {
        $context = get_post_meta($machine_id, 'fms_configuration_notes', true);
        $source_url = get_post_meta($machine_id, 'fms_source_url', true);
        $html.='<section><h4>'.esc_html(get_the_title($machine_id)).'</h4>';
        if ($context !== '') {
            $html.='<p>'.esc_html($context).'</p>';
        } else {
            $html.='<p>Configuration details not recorded. Verify the exact serial and equipment package.</p>';
        }
        if ($source_url !== '') {
            $html.='<p><a href="'.esc_url($source_url).'" rel="noopener noreferrer" target="_blank">View manufacturer reference →</a></p>';
        }
        $html.='</section>';
    }
    $html.='</div><p class="tagline">Horsepower ratings, hydraulic pump totals, hitch capacities and bare tractor weights are not necessarily measured the same way. Compare the manufacturer notes before selecting equipment.</p></div>';
    return $html;
}
add_shortcode('fms_compare','fms_compare_shortcode');
function fms_converter_shortcode(){
    $types=[
        'hp_kw'=>['Horsepower (mechanical HP) → kilowatts',0.745699872,'kW'],
        'kw_hp'=>['Kilowatts → horsepower (mechanical HP)',1.34102209,'HP'],
        'lb_kg'=>['Pounds → kilograms',0.45359237,'kg'],
        'kg_lb'=>['Kilograms → pounds',2.20462262185,'lb'],
        'in_mm'=>['Inches → millimeters',25.4,'mm'],
        'mm_in'=>['Millimeters → inches',0.03937007874,'in'],
        'gal_l'=>['US gallons → liters',3.785411784,'L'],
        'l_gal'=>['Liters → US gallons',0.26417205236,'US gal'],
        'gpm_lmin'=>['US gallons/minute → liters/minute',3.785411784,'L/min'],
        'lmin_gpm'=>['Liters/minute → US gallons/minute',0.26417205236,'US GPM']
    ];
    $selected=isset($_GET['fms_unit'])?sanitize_key(wp_unslash($_GET['fms_unit'])):'hp_kw';
    if(!isset($types[$selected]))$selected='hp_kw';
    $raw=isset($_GET['fms_value'])&&is_scalar($_GET['fms_value'])?sanitize_text_field(wp_unslash($_GET['fms_value'])):'';
    $html='<div class="tool-panel"><form method="get"><div class="form-grid"><label><span>Conversion</span><select name="fms_unit">';
    foreach($types as $key=>$item){$html.='<option value="'.esc_attr($key).'" '.selected($selected,$key,false).'>'.esc_html($item[0]).'</option>';}
    $html.='</select></label><label><span>Enter a value</span><input type="number" name="fms_value" step="any" value="'.esc_attr($raw).'" required></label></div><button type="submit" class="btn">Convert</button></form>';
    if($raw!==''&&is_numeric($raw)&&is_finite((float)$raw)){
        $value=(float)$raw*$types[$selected][1];
        $html.='<p class="tool-result">'.esc_html(number_format($value,4,'.',',')).' '.esc_html($types[$selected][2]).'</p>';
    }
    return $html.'</div><p class="tagline">Conversion uses standard definitions; values are approximate at the displayed precision. This is not a machine-specific performance rating.</p>';
}
add_shortcode('fms_unit_converter','fms_converter_shortcode');
function fms_data_search_types($query){
    if(is_admin()||!$query->is_main_query()||!$query->is_search())return;
    if(isset($_GET['post_type'])&&is_scalar($_GET['post_type'])){ $requested=sanitize_key(wp_unslash($_GET['post_type'])); if(in_array($requested,['fms_machine','fms_part'],true)){ $query->set('post_type',$requested); return; } }
    $query->set('post_type',['post','page','fms_machine','fms_part']);
}
add_action('pre_get_posts','fms_data_search_types');

/**
 * Archive filtering: simple public GET filters rather than many empty SEO-indexed
 * URLs. Canonical always points at the main /machines/ archive, not combinations.
 */
function fms_data_archive_filters($query) {
    if (is_admin() || !$query->is_main_query() || !$query->is_post_type_archive('fms_machine')) {
        return;
    }
    $filters = [
        'fms_filter_brand' => 'fms_brand',
        'fms_filter_type' => 'fms_equipment_type',
    ];
    $tax_query = [];
    foreach ($filters as $get_key => $taxonomy) {
        if (!isset($_GET[$get_key]) || !is_scalar($_GET[$get_key])) {
            continue;
        }
        $slug = sanitize_title(wp_unslash($_GET[$get_key]));
        if ($slug === '') {
            continue;
        }
        $tax_query[] = ['taxonomy' => $taxonomy, 'field' => 'slug', 'terms' => [$slug]];
    }
    if ($tax_query) {
        $query->set('tax_query', $tax_query);
    }
}
add_action('pre_get_posts','fms_data_archive_filters');



/**
 * A client-side aid only: Deere 1025R Filter Pak reference by numeric serial.
 * It does not check machine configuration, kit supersession or dealer inventory.
 */
function fms_serial_filter_checker_shortcode() {
    $lva = 'https://shop.deere.com/us/product/LVA21036%3A-Filter-Pak/p/LVA21036';
    $ta = 'https://shop.deere.com/us/product/TA25769%3A-Filter-Pak/p/TA25769';
    return '<section class="fms-serial-checker" data-fms-1025r-checker aria-labelledby="fms-1025r-heading">
      <span class="kicker">Free owner tool</span>
      <h2 id="fms-1025r-heading">John Deere 1025R filter kit serial-range lookup</h2>
      <p>Enter the numerical serial sequence used in Deere\'s filter-kit listings. The checker runs locally in your browser. It does not verify the full machine identifier, part revisions or the actual fitment of a kit.</p>
      <div class="fms-serial-split" aria-label="Manufacturer-listed serial-number boundaries for John Deere 1025R">
        <div><span class="fms-serial-interval">Through 153036</span><strong>LVA21036</strong><small>Listed for earlier 1025R serials</small></div>
        <div><span class="fms-serial-interval">153037 and later</span><strong>TA25769</strong><small>Listed for later 1025R serials</small></div>
      </div>
      <div class="fms-serial-controls">
        <label for="fms-1025r-serial">1025R numeric serial sequence</label>
        <input type="text" id="fms-1025r-serial" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="e.g. 153037">
        <button type="button" class="btn" data-fms-check>Check range</button>
      </div>
      <p class="fms-serial-result" data-fms-result role="status" aria-live="polite">Result appears here when you enter a number.</p>
      <p class="tagline">Manufacturer sources: <a href="'.esc_url($lva).'" target="_blank" rel="noopener noreferrer">LVA21036</a> and <a href="'.esc_url($ta).'" target="_blank" rel="noopener noreferrer">TA25769</a>. John Deere calls these kits <em>generally compatible</em>. Always confirm complete serial-number fitment and supersessions in the official parts catalog.</p>
    </section>';
}
add_shortcode('fms_1025r_filter_kit_checker','fms_serial_filter_checker_shortcode');


/**
 * Generic arithmetic helper; explicitly not a manufacturer service schedule.
 * Does not store user readings or communicate with the server.
 */
function fms_service_hour_planner_shortcode() {
    return '<section class="fms-hour-planner" data-fms-hour-planner>
        <span class="kicker">Owner maintenance tool</span>
        <h2>Calculate your next hour-meter checkpoint</h2>
        <p>Enter your last recorded service hour and the interval in hours stated in the <em>correct official manual</em>. This calculator performs simple hour arithmetic only; annual, first-service and severe-duty limits may require attention sooner.</p>
        <div class="fms-hour-grid">
          <label>Hours at last service<input type="number" min="0" max="999999" step="0.1" inputmode="decimal" placeholder="e.g. 200" data-fms-last required></label>
          <label>Service interval (hours)<input type="number" min="1" max="10000" step="1" inputmode="numeric" value="200" data-fms-interval required></label>
          <label>Current hour meter<input type="number" min="0" max="999999" step="0.1" inputmode="decimal" placeholder="e.g. 265" data-fms-now required></label>
        </div>
        <button type="button" class="btn" data-fms-calculate>Calculate checkpoint</button>
        <p class="fms-hour-result" data-fms-hour-result role="status" aria-live="polite">Enter your readings to calculate a numerical checkpoint.</p>
        <p class="tagline">This tool does not decide whether a specific oil, filter or service is due. Confirm model-specific hours, annual limits, first-service exceptions and safety instructions against the current operator manual.</p>
    </section>';
}
add_shortcode('fms_service_hour_planner','fms_service_hour_planner_shortcode');
